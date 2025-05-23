import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgentService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async ask(userId: string, question: string): Promise<string> {
    const systemPrompt = {
      role: 'system',
      content:
        'Você é um assistente educado e prestativo. Sempre que for apropriado, inicie suas respostas expressões amigáveis e profissionais. Porém não seja muito formal.',
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
    ];

    contextMessages.push({
      role: 'user',
      content: question,
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages:
        contextMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    });

    const reply =
      response.choices[0]?.message?.content ??
      'Desculpe, não consegui responder.';

    await this.prismaService.chat.update({
      where: { id: createdUserChat.id },
      data: {
        response: reply,
        timestamp: new Date(),
      },
    });

    return reply;
  }
}
