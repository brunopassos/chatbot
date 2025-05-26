import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn((pass) => `hashed-${pass}`),
  compareSync: jest.fn((pass, hash) => hash === `hashed-${pass}`),
}));

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: '1' });

      await expect(
        service.create({ email: 'test@example.com', password: '123' }),
      ).rejects.toThrow(HttpException);
    });

    it('should create a new user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValueOnce({
        id: '1',
        email: 'test@example.com',
      });

      const result = await service.create({
        email: 'test@example.com',
        password: '123',
      });

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        { id: '1', email: 'a@a.com', systemPrompt: 'Hi!' },
        { id: '2', email: 'b@b.com', systemPrompt: null },
      ];
      mockPrismaService.user.findMany.mockResolvedValueOnce(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        select: { id: true, email: true, systemPrompt: true },
      });
    });
  });

  describe('findOne', () => {
    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('1')).rejects.toThrow(HttpException);
    });

    it('should return the user', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        deletedAt: null,
        systemPrompt: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        systemPrompt: undefined,
      });
    });
  });

  describe('findByEmail', () => {
    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.findByEmail('email', '123')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw if password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'email',
        password: 'hashed-abc',
        deletedAt: null,
      });

      await expect(service.findByEmail('email', 'wrong')).rejects.toThrow(
        HttpException,
      );
    });

    it('should return user if credentials are correct', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'email',
        password: 'hashed-123',
        deletedAt: null,
      });

      const result = await service.findByEmail('email', '123');

      expect(result).toEqual({
        id: '1',
        email: 'email',
        password: 'hashed-123',
        deletedAt: null,
      });
    });
  });

  describe('update', () => {
    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.update('1', { email: 'new' })).rejects.toThrow(
        HttpException,
      );
    });

    it('should update and return user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        deletedAt: null,
      });
      mockPrismaService.user.update.mockResolvedValueOnce({
        id: '1',
        email: 'new@example.com',
      });

      const dto: UpdateUserDto = { email: 'new@example.com' };
      const result = await service.update('1', dto);

      expect(result).toEqual({
        id: '1',
        email: 'new@example.com',
        systemPrompt: undefined,
      });
    });
  });

  describe('remove', () => {
    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('1')).rejects.toThrow(HttpException);
    });

    it('should soft delete user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'test@example.com',
        password: 'hashedpassword',
        deletedAt: null,
      });
      mockPrismaService.user.update.mockResolvedValueOnce({});

      await service.remove('1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });
  });
});
