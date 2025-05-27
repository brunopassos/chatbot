import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CHAT_REQUESTS_TOTAL } from '../metrics/metrics.module';
import { Counter } from 'prom-client';

describe('AgentService', () => {
  let service: AgentService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    chat: {
      findMany: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('fake-openai-key'),
  };

  const mockStreamResponse = function* () {
    yield { choices: [{ delta: { content: 'Hello ' } }] };
    yield { choices: [{ delta: { content: 'World!' } }] };
  };

  const mockChatCounter: Partial<Counter<string>> = {
    inc: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CHAT_REQUESTS_TOTAL, useValue: mockChatCounter },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);

    (service as unknown as { openai: any }).openai = {
      chat: {
        completions: {
          create: jest.fn().mockReturnValue(mockStreamResponse()),
        },
      },
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should yield chunks from OpenAI and update chat', async () => {
    const userId = 'user-123';
    const question = 'How are you?';

    mockPrismaService.user.findUnique.mockResolvedValue({ systemPrompt: null });
    mockPrismaService.chat.findMany.mockResolvedValue([]);
    mockPrismaService.chat.create.mockResolvedValue({ id: 'chat-1' });
    mockPrismaService.chat.update.mockResolvedValue({});

    const generator = service.streamAsk(userId, question);

    const results: string[] = [];
    for await (const chunk of generator) {
      results.push(chunk);
    }

    expect(results.join('')).toBe('Hello World!');

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });

    expect(mockPrismaService.chat.create).toHaveBeenCalledWith({
      data: { userId, question, response: '' },
    });

    expect(mockPrismaService.chat.update).toHaveBeenCalledWith({
      where: { id: 'chat-1' },
      data: {
        response: 'Hello World!',
        timestamp: expect.any(Date) as Date,
      },
    });
  });
});
