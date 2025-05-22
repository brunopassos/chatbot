import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UpdateUserValidationPipe implements PipeTransform {
  transform(value: CreateUserDto) {
    const errors: string[] = [];

    if ('email' in value) {
      if (typeof value.email !== 'string') {
        errors.push('Email must be a string.');
      } else if (!this.validateEmail(value.email)) {
        errors.push('Invalid Email.');
      }
    }

    if ('password' in value) {
      if (typeof value.password !== 'string') {
        errors.push('Password must be a string.');
      } else if (value.password.length < 6) {
        errors.push('Password must have at least 6 characters.');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return value;
  }

  private validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}
