import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Chat } from '../agent/entities/chat.entity';
import { AuthGuard } from '../auth/auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findUserChats: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const authGuardMock = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canActivate: jest.fn((context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(authGuardMock)
      .compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user and return UserResponseDto', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: '123456',
      };
      const result: UserResponseDto = { id: 'uuid', email: 'test@example.com' };

      mockUserService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(mockUserService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result: UserResponseDto[] = [
        { id: 'uuid1', email: 'test1@example.com' },
        { id: 'uuid2', email: 'test2@example.com' },
      ];

      mockUserService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual(result);
      expect(mockUserService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const result: UserResponseDto = { id: 'uuid', email: 'test@example.com' };

      mockUserService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('uuid')).toEqual(result);
      expect(mockUserService.findOne).toHaveBeenCalledWith('uuid');
    });
  });

  describe('getChatsByUserId', () => {
    it('should return chats for the given user', async () => {
      const result: Chat[] = [
        {
          id: 'chat1',
          userId: 'uuid',
          question: 'Hi',
          response: 'Hello',
          timestamp: new Date(),
        },
      ];

      mockUserService.findUserChats.mockResolvedValue(result);

      expect(await controller.getChatsByUserId('uuid')).toEqual(result);
      expect(mockUserService.findUserChats).toHaveBeenCalledWith('uuid');
    });
  });

  describe('update', () => {
    it('should update and return the updated user', async () => {
      const dto: UpdateUserDto = { email: 'updated@example.com' };
      const result: UserResponseDto = {
        id: 'uuid',
        email: 'updated@example.com',
      };

      mockUserService.update.mockResolvedValue(result);

      expect(await controller.update('uuid', dto)).toEqual(result);
      expect(mockUserService.update).toHaveBeenCalledWith('uuid', dto);
    });
  });

  describe('remove', () => {
    it('should remove the user', async () => {
      mockUserService.remove.mockResolvedValue(undefined);

      await expect(controller.remove('uuid')).resolves.toBeUndefined();
      expect(mockUserService.remove).toHaveBeenCalledWith('uuid');
    });
  });
});
