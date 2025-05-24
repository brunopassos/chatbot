import { AskPayload } from './ask-payload.interface';

export interface IncomingMessage {
  event: 'ask';
  data: AskPayload;
}
