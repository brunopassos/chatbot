import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

export const CHAT_REQUESTS_TOTAL = 'chat_requests_total';

@Module({
  imports: [PrometheusModule],
  providers: [
    {
      provide: CHAT_REQUESTS_TOTAL,
      useFactory: () => {
        return new Counter({
          name: CHAT_REQUESTS_TOTAL,
          help: 'Número de perguntas feitas ao agente de IA',
        });
      },
    },
  ],
  exports: [CHAT_REQUESTS_TOTAL],
})
export class MetricsModule {}
