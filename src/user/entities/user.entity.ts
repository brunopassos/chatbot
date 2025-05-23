import { Chat } from 'src/agent/entities/chat.entity';

export class User {
  id: string;

  email: string;

  password: string;

  deletedAt: Date | null;

  systemPrompt?: string | null;

  chats?: Chat[];
}
