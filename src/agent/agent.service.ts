import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Counter } from 'prom-client';
import { CHAT_REQUESTS_TOTAL } from '../metrics/metrics.module';
import { Chat } from './entities/chat.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AgentService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    @Inject(CHAT_REQUESTS_TOTAL) private chatCounter: Counter<string>,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async *streamAsk(
    userId: string,
    question: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    try {
      this.chatCounter.inc();

      const user = await this.getUser(userId);
      const systemPrompt = this.buildSystemPrompt(user?.systemPrompt);

      const recentChats = await this.getRecentChats(userId);
      await this.removeOldestChatIfNeeded(recentChats);

      const createdUserChat = await this.createUserChat(userId, question);

      const contextMessages = this.buildContextMessages(
        systemPrompt,
        recentChats,
        question,
      );

      const response = await this.openai.chat.completions.create(
        {
          model: 'gpt-4o',
          stream: true,
          messages:
            contextMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        },
        {
          signal,
        },
      );

      let fullReply = '';

      for await (const chunk of response) {
        if (signal?.aborted) {
          console.log(`[${userId}] Streaming aborted by client.`);
          break;
        }

        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullReply += content;
          yield content;
        }
      }

      await this.updateUserChat(createdUserChat.id, fullReply);
    } catch (error) {
      yield `[ERROR]: ${(error as Error).message}`;
    }
  }

  private async getUser(userId: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id: userId },
    });
  }

  private buildSystemPrompt(systemPrompt: string | null | undefined) {
    return {
      role: 'system',
      content:
        systemPrompt ??
        'Você é um assistente educado e prestativo. Sempre que for apropriado, inicie suas respostas com expressões amigáveis e profissionais.',
    };
  }

  private async getRecentChats(userId: string) {
    return this.prismaService.chat.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' },
    });
  }

  private async removeOldestChatIfNeeded(recentChats: Chat[]) {
    if (recentChats.length >= 5) {
      const oldestChat = recentChats[0];
      await this.prismaService.chat.delete({
        where: { id: oldestChat.id },
      });
    }
  }

  private async createUserChat(userId: string, question: string) {
    return this.prismaService.chat.create({
      data: {
        userId,
        question,
        response: '',
      },
    });
  }

  private buildContextMessages(
    systemPrompt: { role: string; content: string },
    recentChats: Chat[],
    question: string,
  ) {
    return [
      systemPrompt,
      ...recentChats.map((chat) => ({
        role: 'user',
        content: chat.question,
      })),
      { role: 'user', content: question },
    ];
  }

  private async updateUserChat(chatId: string, response: string) {
    await this.prismaService.chat.update({
      where: { id: chatId },
      data: {
        response,
        timestamp: new Date(),
      },
    });
  }
}
