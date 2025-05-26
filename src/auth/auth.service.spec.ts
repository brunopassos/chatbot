import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { User } from '../user/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    deletedAt: null,
  };

  const mockUserService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('should return token and expiresIn on successful login', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'EXPIRES_IN') return 3600;
        if (key === 'JWT_SECRET') return 'secret';
      });
      mockJwtService.signAsync.mockResolvedValue('mocked-jwt-token');

      const result = await service.signIn(mockUser.email, 'password');

      expect(result).toEqual({
        token: 'mocked-jwt-token',
        expiresIn: 3600,
      });

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockUser.email,
        'password',
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, username: mockUser.email },
        { secret: 'secret', expiresIn: '3600s' },
      );
    });

    it('should throw HttpException if user is not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(
        service.signIn('wrong@example.com', 'wrongpass'),
      ).rejects.toThrow(
        new HttpException(
          'Invalid email or password!',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw error if EXPIRES_IN is not set', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockConfigService.get.mockReturnValueOnce(undefined);

      await expect(service.signIn(mockUser.email, 'password')).rejects.toThrow(
        'EXPIRES_IN not configured',
      );
    });
  });
});
