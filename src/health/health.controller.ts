import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        await this.prisma.$queryRawUnsafe('SELECT 1');
        return {
          prisma: {
            status: 'up',
          },
        };
      },
    ]);
  }
}
