import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserValidationPipe } from './pipes/create-user-validation.pipe';
import { UpdateUserValidationPipe } from './pipes/update-user-validation.pipe';
import { Chat } from '../agent/entities/chat.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/v1/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(
    @Body(new UserValidationPipe()) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return await this.userService.create(createUserDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return await this.userService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.userService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Get(':id/chats')
  async getChatsByUserId(@Param('id') userId: string): Promise<Chat[]> {
    return await this.userService.findUserChats(userId);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new UpdateUserValidationPipe()) updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.userService.update(id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.userService.remove(id);
  }
}
