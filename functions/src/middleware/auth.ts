// functions/src/middleware/auth.ts
/**
 * 🎯 鹿鹿小作坊 API 標準化 - 統一權限驗證系統
 * 
 * 建立時間：2025-09-12
 * 目的：建立統一的權限驗證中介層，整合現有權限檢查邏輯
 */

import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { CallableContext } from "firebase-functions/v2/https";
import { BusinessError, ApiErrorCode } from "../utils/errorHandler";

const db = getFirestore();

/**
 * 用戶角色定義
 */
export enum UserRole {
  /** 系統管理員 - 擁有所有權限 */
  ADMIN = 'admin',
  /** 生產領班 - 擁有生產相關權限 */
  FOREMAN = 'foreman', 
  /** 計時人員 - 僅有時間記錄權限 */
  WORKER = 'worker'
}

/**
 * 權限定義
 */
export enum Permission {
  // 物料管理權限
  MATERIALS_VIEW = 'materials.view',
  MATERIALS_MANAGE = 'materials.manage',
  
  // 香精管理權限
  FRAGRANCES_VIEW = 'fragrances.view',
  FRAGRANCES_MANAGE = 'fragrances.manage',
  
  // 供應商管理權限
  SUPPLIERS_VIEW = 'suppliers.view',
  SUPPLIERS_MANAGE = 'suppliers.manage',
  
  // 產品管理權限
  PRODUCTS_VIEW = 'products.view',
  PRODUCTS_MANAGE = 'products.manage',
  
  // 工單管理權限
  WORK_ORDERS_VIEW = 'workOrders.view',
  WORK_ORDERS_MANAGE = 'workOrders.manage',
  WORK_ORDERS_CREATE = 'workOrders.create',
  WORK_ORDERS_ASSIGN = 'workOrders.assign',
  
  // 採購管理權限
  PURCHASE_ORDERS_VIEW = 'purchaseOrders.view',
  PURCHASE_ORDERS_MANAGE = 'purchaseOrders.manage',
  
  // 人員管理權限
  PERSONNEL_VIEW = 'personnel.view',
  PERSONNEL_MANAGE = 'personnel.manage',
  
  // 庫存管理權限
  INVENTORY_VIEW = 'inventory.view',
  INVENTORY_ADJUST = 'inventory.adjust',
  
  // 時間記錄權限
  TIME_RECORDS_VIEW = 'timeRecords.view',
  TIME_RECORDS_MANAGE = 'timeRecords.manage',
  TIME_RECORDS_OWN = 'timeRecords.own', // 只能管理自己的時間記錄
  
  // 報表權限
  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',
  
  // 系統管理權限
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',
  SYSTEM_CONFIG = 'system.config',
}

/**
 * 角色權限映射
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 管理員擁有所有權限
    ...Object.values(Permission)
  ],
  
  [UserRole.FOREMAN]: [
    // 領班權限：除了用戶/角色管理外的大部分權限
    Permission.MATERIALS_VIEW,
    Permission.MATERIALS_MANAGE,
    Permission.FRAGRANCES_VIEW,
    Permission.FRAGRANCES_MANAGE,
    Permission.SUPPLIERS_VIEW,
    Permission.SUPPLIERS_MANAGE,
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_MANAGE,
    Permission.WORK_ORDERS_VIEW,
    Permission.WORK_ORDERS_MANAGE,
    Permission.WORK_ORDERS_CREATE,
    Permission.WORK_ORDERS_ASSIGN,
    Permission.PURCHASE_ORDERS_VIEW,
    Permission.PURCHASE_ORDERS_MANAGE,
    Permission.PERSONNEL_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_ADJUST,
    Permission.TIME_RECORDS_VIEW,
    Permission.TIME_RECORDS_MANAGE,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
  
  [UserRole.WORKER]: [
    // 工人權限：主要是查看和自己的時間記錄
    Permission.MATERIALS_VIEW,
    Permission.FRAGRANCES_VIEW,
    Permission.PRODUCTS_VIEW,
    Permission.WORK_ORDERS_VIEW,
    Permission.TIME_RECORDS_OWN,
    Permission.INVENTORY_VIEW,
  ]
};

/**
 * 用戶資訊介面
 */
export interface UserInfo {
  uid: string;
  email?: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: Date;
}

/**
 * 權限驗證服務
 */
export class AuthService {
  /**
   * 獲取用戶資訊
   */
  static async getUserInfo(uid: string): Promise<UserInfo | null> {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        logger.warn(`User not found in database: ${uid}`);
        return null;
      }
      
      const userData = userDoc.data()!;
      const role = userData.role as UserRole || UserRole.WORKER;
      
      // 獲取角色對應的權限
      const permissions = ROLE_PERMISSIONS[role] || [];
      
      return {
        uid,
        email: userData.email,
        role,
        permissions,
        isActive: userData.isActive !== false, // 預設為 true
        lastLoginAt: userData.lastLoginAt?.toDate()
      };
    } catch (error) {
      logger.error(`Error fetching user info for ${uid}:`, error);
      return null;
    }
  }
  
  /**
   * 檢查用戶是否擁有指定權限
   */
  static async hasPermission(uid: string, permission: Permission): Promise<boolean> {
    const userInfo = await this.getUserInfo(uid);
    
    if (!userInfo || !userInfo.isActive) {
      return false;
    }
    
    return userInfo.permissions.includes(permission);
  }
  
  /**
   * 檢查用戶角色
   */
  static async hasRole(uid: string, role: UserRole): Promise<boolean> {
    const userInfo = await this.getUserInfo(uid);
    
    if (!userInfo || !userInfo.isActive) {
      return false;
    }
    
    // 管理員擁有所有角色權限
    if (userInfo.role === UserRole.ADMIN) {
      return true;
    }
    
    return userInfo.role === role;
  }
  
  /**
   * 檢查用戶是否至少擁有指定角色等級
   */
  static async hasRoleLevel(uid: string, minimumRole: UserRole): Promise<boolean> {
    const userInfo = await this.getUserInfo(uid);
    
    if (!userInfo || !userInfo.isActive) {
      return false;
    }
    
    const roleHierarchy = {
      [UserRole.WORKER]: 1,
      [UserRole.FOREMAN]: 2,
      [UserRole.ADMIN]: 3
    };
    
    const userLevel = roleHierarchy[userInfo.role] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 0;
    
    return userLevel >= requiredLevel;
  }
  
  /**
   * 更新用戶最後登入時間
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      await db.collection('users').doc(uid).update({
        lastLoginAt: new Date()
      });
    } catch (error) {
      logger.warn(`Failed to update last login for ${uid}:`, error);
    }
  }
}

/**
 * 權限檢查裝飾器工廠
 */
export class AuthDecorators {
  /**
   * 要求用戶已認證
   */
  static requireAuth() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const context = args.find(arg => arg && arg.auth) as CallableContext;
        
        if (!context?.auth?.uid) {
          throw new BusinessError(
            ApiErrorCode.UNAUTHORIZED,
            '請先登入才能使用此功能'
          );
        }
        
        // 更新最後登入時間
        AuthService.updateLastLogin(context.auth.uid).catch(() => {});
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
  
  /**
   * 要求指定權限
   */
  static requirePermission(permission: Permission) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const context = args.find(arg => arg && arg.auth) as CallableContext;
        
        if (!context?.auth?.uid) {
          throw new BusinessError(
            ApiErrorCode.UNAUTHORIZED,
            '請先登入才能使用此功能'
          );
        }
        
        const hasPermission = await AuthService.hasPermission(context.auth.uid, permission);
        
        if (!hasPermission) {
          throw new BusinessError(
            ApiErrorCode.PERMISSION_DENIED,
            '您沒有權限執行此操作'
          );
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
  
  /**
   * 要求指定角色
   */
  static requireRole(role: UserRole) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const context = args.find(arg => arg && arg.auth) as CallableContext;
        
        if (!context?.auth?.uid) {
          throw new BusinessError(
            ApiErrorCode.UNAUTHORIZED,
            '請先登入才能使用此功能'
          );
        }
        
        const hasRole = await AuthService.hasRole(context.auth.uid, role);
        
        if (!hasRole) {
          throw new BusinessError(
            ApiErrorCode.PERMISSION_DENIED,
            '您的角色權限不足'
          );
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
  
  /**
   * 要求最低角色等級
   */
  static requireRoleLevel(minimumRole: UserRole) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const context = args.find(arg => arg && arg.auth) as CallableContext;
        
        if (!context?.auth?.uid) {
          throw new BusinessError(
            ApiErrorCode.UNAUTHORIZED,
            '請先登入才能使用此功能'
          );
        }
        
        const hasRoleLevel = await AuthService.hasRoleLevel(context.auth.uid, minimumRole);
        
        if (!hasRoleLevel) {
          throw new BusinessError(
            ApiErrorCode.PERMISSION_DENIED,
            '您的權限等級不足'
          );
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
}

/**
 * 向後相容性：舊版權限檢查函數
 */
export namespace LegacyAuthChecks {
  /**
   * 檢查是否為管理員（舊版 ensureIsAdmin）
   */
  export async function ensureIsAdmin(uid?: string): Promise<void> {
    if (!uid) {
      throw new BusinessError(
        ApiErrorCode.UNAUTHORIZED,
        '請先登入才能使用此功能'
      );
    }
    
    const hasAdminRole = await AuthService.hasRole(uid, UserRole.ADMIN);
    
    if (!hasAdminRole) {
      throw new BusinessError(
        ApiErrorCode.PERMISSION_DENIED,
        '需要管理員權限'
      );
    }
  }
  
  /**
   * 檢查是否為管理員或領班（舊版 ensureIsAdminOrForeman）
   */
  export async function ensureIsAdminOrForeman(uid?: string): Promise<void> {
    if (!uid) {
      throw new BusinessError(
        ApiErrorCode.UNAUTHORIZED,
        '請先登入才能使用此功能'
      );
    }
    
    const hasRequiredRole = await AuthService.hasRoleLevel(uid, UserRole.FOREMAN);
    
    if (!hasRequiredRole) {
      throw new BusinessError(
        ApiErrorCode.PERMISSION_DENIED,
        '需要管理員或領班權限'
      );
    }
  }
  
  /**
   * 檢查物料管理權限
   */
  export async function ensureCanManageMaterials(uid?: string): Promise<void> {
    if (!uid) {
      throw new BusinessError(
        ApiErrorCode.UNAUTHORIZED,
        '請先登入才能使用此功能'
      );
    }
    
    const hasPermission = await AuthService.hasPermission(uid, Permission.MATERIALS_MANAGE);
    
    if (!hasPermission) {
      throw new BusinessError(
        ApiErrorCode.PERMISSION_DENIED,
        '需要物料管理權限'
      );
    }
  }
  
  /**
   * 檢查香精管理權限
   */
  export async function ensureCanManageFragrances(uid?: string): Promise<void> {
    if (!uid) {
      throw new BusinessError(
        ApiErrorCode.UNAUTHORIZED,
        '請先登入才能使用此功能'
      );
    }
    
    const hasPermission = await AuthService.hasPermission(uid, Permission.FRAGRANCES_MANAGE);
    
    if (!hasPermission) {
      throw new BusinessError(
        ApiErrorCode.PERMISSION_DENIED,
        '需要香精管理權限'
      );
    }
  }
}

/**
 * 權限檢查輔助函數（用於 API 包裝器）
 */
export async function checkAuthPermission(
  uid: string,
  permission?: Permission,
  role?: UserRole
): Promise<void> {
  // 檢查權限
  if (permission) {
    const hasPermission = await AuthService.hasPermission(uid, permission);
    if (!hasPermission) {
      throw new BusinessError(
        ApiErrorCode.PERMISSION_DENIED,
        '您沒有權限執行此操作'
      );
    }
  }
  
  // 檢查角色
  if (role) {
    const hasRole = await AuthService.hasRoleLevel(uid, role);
    if (!hasRole) {
      throw new BusinessError(
        ApiErrorCode.PERMISSION_DENIED,
        '您的角色權限不足'
      );
    }
  }
}