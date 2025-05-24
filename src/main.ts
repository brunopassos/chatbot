import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AgentService } from './agent/agent.service';
import { AgentGateway } from './agent/agent.gateway';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const agentService = app.get(AgentService);
  const jwtService = app.get(JwtService);

  new AgentGateway(agentService, jwtService).onModuleInit();

  await app.listen(3000);
}
bootstrap();
