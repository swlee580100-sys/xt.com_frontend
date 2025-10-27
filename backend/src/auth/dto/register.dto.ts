import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import type { Role } from '../../common/decorators/roles.decorator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @IsArray()
  roles?: Role[];
}
