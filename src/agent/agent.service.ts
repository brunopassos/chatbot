import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Counter } from 'prom-client';
import { CHAT_REQUESTS_TOTAL } from '../metrics/metrics.module';

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

      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      //validar se o usuário existe

      const systemPrompt = {
        role: 'system',
        content:
          user?.systemPrompt ??
          'Você é um assistente educado e prestativo. Sempre que for apropriado, inicie suas respostas com expressões amigáveis e profissionais.',
      };

      const recentChats = await this.prismaService.chat.findMany({
        where: { userId },
        orderBy: { timestamp: 'asc' },
      });

      if (recentChats.length >= 5) {
        const oldestChat = recentChats[0];
        await this.prismaService.chat.delete({
          where: { id: oldestChat.id },
        });
      }

      const createdUserChat = await this.prismaService.chat.create({
        data: {
          userId,
          question,
          response: '',
        },
      });

      const contextMessages = [
        systemPrompt,
        ...recentChats.map((chat) => ({
          role: 'user',
          content: chat.question,
        })),
        { role: 'user', content: question },
      ];

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

      await this.prismaService.chat.update({
        where: { id: createdUserChat.id },
        data: {
          response: fullReply,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      yield `[ERROR]: ${(error as Error).message}`;
    }
  }
}
