export interface UserAccount {
  id: number;
  fullName: string;
  username: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  location: string;
  active: boolean;
}

interface BranchResponse {
  status: number;
  message: string;
  data: Branch[];
  timestamp: string;
}

export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'BRANCH_USER'
  | 'AUDITOR';

export interface RegisterUserRequest {
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
  branchId: number | null;
}