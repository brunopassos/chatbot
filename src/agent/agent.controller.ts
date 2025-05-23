import { Controller, Post, Body } from '@nestjs/common';
import { AskDto } from './dto/ask.dto';
import { AgentService } from './agent.service';
import { Request } from 'express';

@Controller('api/v1/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('/ask')
  async ask(@Body() askDto: AskDto) {
    // const user = req.user;
    // const userId = user?.id ?? 'anonymous';

    const userId = '924e9c07-dd98-477f-822b-3853e9de8fb3';

    const response = await this.agentService.ask(userId, askDto.ask);

    return { response };
  }
}
