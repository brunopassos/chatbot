import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AskDto } from './dto/ask.dto';
import { AgentService } from './agent.service';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@Controller('api/v1/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @UseGuards(AuthGuard)
  @Post('/ask')
  async ask(@Body() askDto: AskDto, @Req() req: AuthenticatedRequest) {
    const user = req.user;

    const response = await this.agentService.ask(user.sub, askDto.ask);

    return { response };
  }
}
