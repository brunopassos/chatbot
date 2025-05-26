import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    mockConfigService.get.mockReturnValue('mock-secret');

    jwtService = mockJwtService as unknown as JwtService;
    configService = mockConfigService as unknown as ConfigService;

    guard = new AuthGuard(jwtService, configService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true and attach user if token is valid', async () => {
    const mockPayload = { sub: 1, username: 'user@example.com' };

    const mockRequest = {
      headers: {
        authorization: 'Bearer valid.token.here',
      },
    };

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    });

    mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockRequest['user']).toEqual(mockPayload);
  });

  it('should throw UnauthorizedException if token is missing', async () => {
    const mockRequest = {
      headers: {},
    };

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token is invalid', async () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer invalid.token',
      },
    };

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    });

    mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
