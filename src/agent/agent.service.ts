import { Injectable } from '@nestjs/common';
import { ChatMessage } from './interfaces/chat.interface';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgentService {
  private openai: OpenAI;

  private chatHistories: Record<string, ChatMessage[]> = {};

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async ask(userId: string, question: string): Promise<string> {
    const systemPrompt = {
      role: 'system',
      content:
        'Você é um assistente educado e prestativo. Sempre responde começando com: "Claro, posso te ajudar com isso!"',
    };

    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    const context = this.chatHistories[userId] || [];
    context.push(userMessage);

    if (context.length > 5) {
      context.splice(0, context.length - 5);
    }

    this.chatHistories[userId] = context;

    const messages = [
      systemPrompt,
      ...context.map((c) => ({ role: c.role, content: c.content })),
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    const reply =
      response.choices[0]?.message?.content ??
      'Desculpe, não consegui responder.';

    context.push({
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    });

    if (context.length > 5) {
      context.splice(0, context.length - 5);
    }

    this.chatHistories[userId] = context;

    return reply;
  }
}
