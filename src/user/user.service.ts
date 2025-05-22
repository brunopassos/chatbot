import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  private users: User[] = [];

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const userAlreadyExists = this.users.find(
      (user) => user.email === createUserDto.email,
    );

    if (userAlreadyExists) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const newUser: User = {
      id: randomUUID(),
      email: createUserDto.email,
      password: await bcrypt.hash(createUserDto.password, 10),
      deletedAt: null,
    };

    this.users.push(newUser);

    return {
      id: newUser.id,
      email: newUser.email,
    };
  }

  findAll(): UserResponseDto[] {
    return plainToInstance(UserResponseDto, this.users);
  }

  findOne(id: string): UserResponseDto {
    const foundUser = this.users.find((user) => user.id === id);

    if (!foundUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return plainToInstance(UserResponseDto, foundUser);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const foundUser = this.users.find((user) => user.id === id);

    if (!foundUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (updateUserDto.email !== undefined) {
      foundUser.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      foundUser.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return plainToInstance(UserResponseDto, foundUser, {
      excludeExtraneousValues: true,
    });
  }

  remove(id: string): void {
    const user = this.users.find((u) => u.id === id);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.deletedAt) {
      user.deletedAt = new Date();
    }
  }
}
