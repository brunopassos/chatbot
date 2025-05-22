import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { hashSync as bcryptHashSync, compareSync } from 'bcryptjs';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  private users: User[] = [
    {
      id: 'bae0496e-3ef6-411d-8a20-88d7dfefa402',
      email: 'brunow@mail.com',
      password: '$2b$10$WRCPSC89mtf1hw1wc2H/5uKdunj8amjinUOc8hdR3i4ulpzxS5wc.',
      deletedAt: null,
    },
    {
      id: '924e9c07-dd98-477f-822b-3853e9de8fb3',
      email: 'bruno@mail.com',
      password: '$2b$10$KCQvAwBbRdHspo3XBYqPc.2Rff7FmMb6CWQxL/wLR1RHdFDEFDOGa',
      deletedAt: null,
    },
  ];

  create(createUserDto: CreateUserDto): UserResponseDto {
    const userAlreadyExists = this.users.find(
      (user) => user.email === createUserDto.email,
    );

    if (userAlreadyExists) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const newUser: User = {
      id: randomUUID(),
      email: createUserDto.email,
      password: bcryptHashSync(createUserDto.password, 10),
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

  findByEmail(email: string, pass: string): User {
    const foundUser = this.users.find((user) => user.email === email);
    const invalidCredentialsMessage = 'Invalid email or password!';

    if (!foundUser) {
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
  }

  update(id: string, updateUserDto: UpdateUserDto): UserResponseDto {
    const foundUser = this.users.find((user) => user.id === id);

    if (!foundUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (updateUserDto.email !== undefined) {
      foundUser.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      foundUser.password = bcryptHashSync(updateUserDto.password, 10);
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
