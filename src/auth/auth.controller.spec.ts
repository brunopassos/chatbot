import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRequestDto } from './dto/auth-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should return a token and expiresIn when login is successful', async () => {
      const dto: AuthRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult: AuthResponseDto = {
        token: 'jwt_token_mock',
        expiresIn: 3600,
      };

      mockAuthService.signIn.mockResolvedValue(expectedResult);

      const result = await controller.signIn(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
    });

    it('should throw if authService.signIn throws', async () => {
      const dto: AuthRequestDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.signIn.mockRejectedValue(
        new Error('Invalid credentials'),
      );

      await expect(controller.signIn(dto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
