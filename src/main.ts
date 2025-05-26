import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AgentService } from './agent/agent.service';
import { AgentGateway } from './agent/agent.gateway';
import { JwtService } from '@nestjs/jwt';
import * as http from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpServer = http.createServer(app.getHttpAdapter().getInstance());

  const agentService = app.get(AgentService);
  const jwtService = app.get(JwtService);

  const agentGateway = new AgentGateway(agentService, jwtService);
  agentGateway.init(httpServer);

  await app.init();
  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`App and WebSocket listening on port ${port}`);
  });
}
bootstrap();
