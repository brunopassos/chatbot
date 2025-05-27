import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signIn(email: string, pass: string): Promise<AuthResponseDto> {
    try {
      const user: User = await this.userService.findByEmail(email, pass);

      const invalidCredentialsMessage = 'Invalid email or password!';

      if (!user) {
        throw new HttpException(
          invalidCredentialsMessage,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const payload: JwtPayload = { sub: user.id, username: user.email };

      const expiresIn = this.configService.get<number>('EXPIRES_IN');

      if (expiresIn === undefined) {
        throw new Error('EXPIRES_IN not configured');
      }
      return {
        token: await this.jwtService.signAsync(payload, {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: `${expiresIn}s`,
        }),
        expiresIn: +expiresIn,
      };
    } catch (error) {
      throw new HttpException(
        `${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
