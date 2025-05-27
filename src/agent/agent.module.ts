import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [PrismaModule, ConfigModule, MetricsModule],
  controllers: [],
  providers: [AgentService],
})
export class AgentModule {}
