import { User } from 'src/user/entities/user.entity';

export class Chat {
  id: string;

  userId: string;

  question: string;

  response: string;

  timestamp: Date;

  user?: User;
}
