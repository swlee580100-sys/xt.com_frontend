import { IsOptional, IsString, IsEmail, IsBoolean, IsEnum, IsArray } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  TRADER = 'trader',
  VIEWER = 'viewer',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;
}
