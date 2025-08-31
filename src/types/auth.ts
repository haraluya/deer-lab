// src/types/auth.ts
/**
 * 身份驗證和用戶相關類型定義
 */

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  employeeId: string;
  name: string;
  position: string;
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roleRef?: string;
  role?: UserRole;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
}

export interface AuthContextType {
  user: any;
  appUser: AppUser | null;
  isLoading: boolean;
  login: (employeeId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}