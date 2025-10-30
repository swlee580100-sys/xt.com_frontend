import { IsArray, IsEnum } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  TRADER = 'trader',
  VIEWER = 'viewer',
}

export class UpdateUserRolesDto {
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
