import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService: Partial<UserService> = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService as UserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return response without systemPrompt', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: '123456',
      };

      const createdUser: UserResponseDto = {
        id: '1',
        email: 'test@example.com',
      };

      (mockUserService.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await controller.create(dto);

      expect(result).toEqual(createdUser);
      expect(mockUserService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users: UserResponseDto[] = [
        { id: '1', email: 'test1@example.com', systemPrompt: 'Hi!' },
        { id: '2', email: 'test2@example.com', systemPrompt: null },
      ];

      (mockUserService.findAll as jest.Mock).mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user: UserResponseDto = {
        id: '1',
        email: 'test@example.com',
        systemPrompt: null,
      };

      (mockUserService.findOne as jest.Mock).mockResolvedValue(user);

      const result = await controller.findOne('1');

      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const dto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'newpass123',
        systemPrompt: 'New prompt',
      };

      const updatedUser: UserResponseDto = {
        id: '1',
        email: dto.email!,
        systemPrompt: dto.systemPrompt,
      };

      (mockUserService.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updatedUser);
      expect(mockUserService.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with given id and return void', async () => {
      (mockUserService.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(result).toBeUndefined();
      expect(mockUserService.remove).toHaveBeenCalledWith('1');
    });
  });
});
