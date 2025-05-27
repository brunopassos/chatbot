import { Injectable } from '@nestjs/common';
import { AgentService } from './agent.service';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthenticatedWebSocket } from './interfaces/authenticated-websocket.interface';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { Server as HttpServer } from 'http';

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
      const authHeader = req.headers['authorization'];

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ws.close(4001, 'Token not provided or poorly formatted');
        return;
      }

      const token = authHeader.split(' ')[1];

      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify<JwtPayload>(token);
      } catch (err) {
        console.error('Invalid token:', err);
        ws.close(4002, 'Invalid token');
        return;
      }

      const authedWs = ws as AuthenticatedWebSocket;
      authedWs.userId = payload.sub;
      authedWs.isStreaming = false;

      ws.on('close', () => {
        if (authedWs.abortController) {
          authedWs.abortController.abort();
          console.log(
            `[${authedWs.userId}] Connection closed — stream canceled.`,
          );
        }
      });

      ws.on('message', (message: WebSocket.Data) => {
        void (async () => {
          const raw =
            typeof message === 'string'
              ? message
              : Buffer.isBuffer(message)
                ? message.toString('utf8')
                : '';

          if (!raw) return;

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
            (parsed as IncomingMessage).event === 'ask'
          ) {
            const { question } = (parsed as IncomingMessage).data;
            const userId = authedWs.userId;

            if (authedWs.isStreaming) {
              ws.send(
                JSON.stringify({
                  event: 'error',
                  data: { message: 'There is already a question in progress.' },
                }),
              );
              return;
            }

            authedWs.isStreaming = true;
            const abortController = new AbortController();
            authedWs.abortController = abortController;

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
            } catch (err) {
              if (abortController.signal.aborted) {
                console.log(`[${userId}] Stream aborted.`);
              } else {
                console.error('Error while processing ask:', err);
                ws.send(
                  JSON.stringify({
                    event: 'error',
                    data: { message: 'Internal server error' },
                  }),
                );
              }
            } finally {
              authedWs.isStreaming = false;
              authedWs.abortController = undefined;
            }
          } else {
            console.warn('Invalid WebSocket Message:', parsed);
          }
        });
      });
    });
  }
}
