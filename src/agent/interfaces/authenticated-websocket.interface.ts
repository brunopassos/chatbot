import WebSocket from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  isStreaming?: boolean;
  abortController?: AbortController;
}
