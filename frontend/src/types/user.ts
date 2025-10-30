export interface User {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  roles: string[];
  isActive: boolean;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  demoBalance: string;
  realBalance: string;
  totalProfitLoss: string;
  totalTrades: number;
  winRate: string;
}

export interface PaginatedUsersResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED';
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'displayName' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  isActive?: boolean;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED';
}

export interface UpdateUserRolesDto {
  roles: string[];
}

export interface AdjustBalanceDto {
  balanceType: 'demo' | 'real';
  adjustmentType: 'add' | 'subtract' | 'set';
  amount: number;
  reason?: string;
}
