import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { hashSync as bcryptHashSync, compareSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const userAlreadyExists = await this.prismaService.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (userAlreadyExists) {
        throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
      }

      const newUser = await this.prismaService.user.create({
        data: {
          id: randomUUID(),
          email: createUserDto.email,
          password: bcryptHashSync(createUserDto.password, 10),
          deletedAt: null,
        },
      });

      return {
        id: newUser.id,
        email: newUser.email,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.prismaService.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          systemPrompt: true,
        },
      });

      return users;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const foundUser = await this.prismaService.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          deletedAt: true,
          systemPrompt: true,
        },
      });

      if (!foundUser || foundUser.deletedAt) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: foundUser.id,
        email: foundUser.email,
        systemPrompt: foundUser.systemPrompt ?? undefined,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findByEmail(email: string, pass: string): Promise<User> {
    try {
      const foundUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      const invalidCredentialsMessage = 'Invalid email or password!';

      if (!foundUser || foundUser.deletedAt) {
        throw new HttpException(
          invalidCredentialsMessage,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const passwordMatches = compareSync(pass, foundUser.password);

      if (!passwordMatches) {
        throw new HttpException(
          invalidCredentialsMessage,
          HttpStatus.UNAUTHORIZED,
        );
      }

      return foundUser;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const foundUser = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!foundUser || foundUser.deletedAt) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const data: { email?: string; password?: string; systemPrompt?: string } =
        {};

      if (updateUserDto.email !== undefined) {
        data.email = updateUserDto.email;
      }

      if (updateUserDto.password !== undefined) {
        data.password = bcryptHashSync(updateUserDto.password, 10);
      }

      if (updateUserDto.systemPrompt !== undefined) {
        data.systemPrompt = updateUserDto.systemPrompt;
      }

      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data,
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        systemPrompt: updateUserDto.systemPrompt,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id },
      });

      if (!user || user.deletedAt) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      await this.prismaService.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
