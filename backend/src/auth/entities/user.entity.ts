import type { Role } from '../../common/decorators/roles.decorator';

export interface UserEntity {
  id: string;
  email: string;
  displayName: string;
  passwordHash?: string; // 可选字段，因为 sanitizeUser 会移除它
  roles: Role[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
