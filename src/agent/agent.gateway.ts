import { Injectable } from '@nestjs/common';
import { AgentService } from './agent.service';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthenticatedWebSocket } from './interfaces/authenticated-websocket.interface';
import { Message } from './interfaces/incoming-message.interface';
import { Server as HttpServer, IncomingMessage } from 'http';

@Injectable()
export class AgentGateway {
  private wss: WebSocketServer;

  constructor(
    private readonly agentService: AgentService,
    private readonly jwtService: JwtService,
  ) {}

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const authedWs = this.authenticate(ws, req);
      if (!authedWs) return;

      ws.on('close', () => this.handleClose(authedWs));
      ws.on(
        'message',
        (message: WebSocket.Data) => void this.handleMessage(authedWs, message),
      );
    });
  }

  private authenticate(
    ws: WebSocket,
    req: IncomingMessage,
  ): AuthenticatedWebSocket | null {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ws.close(4001, 'Token not provided or poorly formatted');
      return null;
    }

    const token = authHeader.split(' ')[1];

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch (err) {
      console.error('Invalid token:', err);
      ws.close(4002, 'Invalid token');
      return null;
    }

    const authedWs = ws as AuthenticatedWebSocket;
    authedWs.userId = payload.sub;
    authedWs.isStreaming = false;

    return authedWs;
  }

  private handleClose(authedWs: AuthenticatedWebSocket) {
    if (authedWs.abortController) {
      authedWs.abortController.abort();
      console.log(`[${authedWs.userId}] Connection closed — stream canceled.`);
    }
  }

  private async handleMessage(
    ws: AuthenticatedWebSocket,
    message: WebSocket.Data,
  ) {
    try {
      const raw =
        typeof message === 'string'
          ? message
          : Buffer.isBuffer(message)
            ? message.toString('utf8')
            : '';

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error('Error parsing JSON:', err);
        return;
      }

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'event' in parsed &&
        'data' in parsed &&
        (parsed as Message).event === 'ask'
      ) {
        await this.handleAskEvent(ws, parsed as Message);
      } else {
        console.warn('Invalid Websocket message:', parsed);
      }
    } catch (err) {
      console.error('Unexpected error in message handler:', err);
    }
  }

  private async handleAskEvent(ws: AuthenticatedWebSocket, message: Message) {
    const { question } = message.data;
    const userId = ws.userId;

    if (ws.isStreaming) {
      ws.send(
        JSON.stringify({
          event: 'error',
          data: {
            message: 'There is already a question in progress.',
          },
        }),
      );
      return;
    }

    ws.isStreaming = true;
    const abortController = new AbortController();
    ws.abortController = abortController;

    try {
      const stream = this.agentService.streamAsk(
        userId,
        question,
        abortController.signal,
      );

      for await (const chunk of stream) {
        ws.send(
          JSON.stringify({
            event: 'stream',
            data: {
              userId,
              token: chunk,
              timestamp: Date.now(),
            },
          }),
        );
      }

      ws.send(JSON.stringify({ event: 'done' }));
    } catch {
      if (abortController.signal.aborted) {
        console.log(`[${userId}] Stream aborted.`);
      } else {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: { message: 'Internal server error' },
          }),
        );
      }
    } finally {
      ws.isStreaming = false;
      ws.abortController = undefined;
    }
  }
}
