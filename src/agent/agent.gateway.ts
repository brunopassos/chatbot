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
        ws.close(4001, 'Token não fornecido ou mal formatado');
        return;
      }

      const token = authHeader.split(' ')[1];

      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify<JwtPayload>(token);
      } catch (err) {
        console.error('Token inválido:', err);
        ws.close(4002, 'Token inválido');
        return;
      }

      const authedWs = ws as AuthenticatedWebSocket;
      authedWs.userId = payload.sub;

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ws.on('message', async (message: WebSocket.Data) => {
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
          console.error('Erro ao fazer parse do JSON:', err);
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

          try {
            const stream = this.agentService.streamAsk(userId, question);

            for await (const chunk of stream) {
              ws.send(JSON.stringify({ event: 'stream', data: { chunk } }));
            }

            ws.send(JSON.stringify({ event: 'done' }));
          } catch (err) {
            console.error('Erro durante o processamento do ask:', err);
            ws.send(
              JSON.stringify({
                event: 'error',
                data: { message: 'Erro interno no servidor' },
              }),
            );
          }
        } else {
          console.warn('Mensagem WebSocket inválida:', parsed);
        }
      });
    });
  }
}
