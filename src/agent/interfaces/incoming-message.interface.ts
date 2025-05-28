import { AskPayload } from './ask-payload.interface';

export interface Message {
  event: 'ask';
  data: AskPayload;
}
