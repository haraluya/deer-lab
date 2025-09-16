// src/hooks/usePermission.ts
/**
 * 權限檢查相關 Hook
 */

import { useAuth, UserLevel } from '@/context/AuthContext';
import { canAccessPage, canManagePage } from '@/utils/permissions';

// 管理員員工ID白名單 (與 AuthContext 保持一致)
const ADMIN_EMPLOYEE_IDS = ['052', 'admin', 'administrator'];

// 簡化的級別檢查函數
const hasAccess = (userLevel: UserLevel | undefined, requiredLevel: UserLevel): boolean => {
  if (!userLevel) return false;
  const hierarchy = ['viewer', 'operator', 'manager', 'admin'];
  const userIndex = hierarchy.indexOf(userLevel);
  const requiredIndex = hierarchy.indexOf(requiredLevel);
  return userIndex >= requiredIndex;
};

/**
 * 權限檢查 Hook
 * 提供各種權限檢查功能
 */
export function usePermission() {
  const { appUser, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  /**
   * 檢查是否可以訪問特定頁面
   * @param pathname 頁面路徑
   * @returns 是否有權限
   */
  const canAccess = (pathname: string): boolean => {
    // 工作台對所有已登入用戶開放
    if (pathname === '/dashboard') {
      return true;
    }
    
    // 如果沒有權限陣列，預設拒絕訪問（除了工作台）
    if (!appUser?.permissions || !Array.isArray(appUser.permissions)) {
      console.log('⚠️  權限檢查失敗: 無權限陣列', { pathname, user: appUser?.name });
      return false;
    }
    
    console.log('🔍 權限檢查:', { pathname, permissions: appUser.permissions });
    return canAccessPage(pathname, appUser.permissions);
  };

  /**
   * 檢查是否可以管理特定頁面
   * @param pathname 頁面路徑
   * @returns 是否有管理權限
   */
  const canManage = (pathname: string): boolean => {
    if (!appUser?.permissions) return false;
    return canManagePage(pathname, appUser.permissions);
  };

  /**
   * 檢查是否為系統管理員 (優化版，明確優先順序)
   * @returns 是否為管理員
   */
  const isAdmin = (): boolean => {
    if (!appUser) {
      console.log('🔍 isAdmin: 無用戶資料');
      return false;
    }

    // 🥇 最高優先級：白名單檢查
    if (appUser.employeeId && ADMIN_EMPLOYEE_IDS.includes(appUser.employeeId)) {
      console.log('🔑 isAdmin: 白名單管理員', { employeeId: appUser.employeeId });
      return true;
    }

    // 🥈 第二優先級：萬用字元權限檢查
    if (hasPermission('*')) {
      console.log('🌟 isAdmin: 萬用字元權限');
      return true;
    }

    // 🥉 第三優先級：用戶級別檢查
    if (appUser.userLevel === 'admin') {
      console.log('👑 isAdmin: admin 級別');
      return true;
    }

    // 🏅 第四優先級：特定權限檢查
    if (hasPermission('roles.manage')) {
      console.log('🔧 isAdmin: 角色管理權限');
      return true;
    }

    console.log('❌ isAdmin: 無管理員權限', {
      employeeId: appUser.employeeId,
      userLevel: appUser.userLevel,
      permissions: appUser.permissions?.slice(0, 5) // 只顯示前5個權限
    });
    return false;
  };

  /**
   * 檢查是否為管理階層 (manager 以上)
   * @returns 是否為管理階層
   */
  const isManager = (): boolean => {
    // 管理員也是管理階層
    if (isAdmin()) return true;

    // 級別檢查
    return hasAccess(appUser?.userLevel, 'manager');
  };

  /**
   * 檢查是否為生產領班 (簡化版)
   * @returns 是否為領班
   */
  const isForeman = (): boolean => {
    return isManager() || hasPermission('workOrders.manage') || hasPermission('workOrders:manage');
  };

  /**
   * 檢查是否為計時人員 (簡化版)
   * @returns 是否為計時人員
   */
  const isTimekeeper = (): boolean => {
    return hasAccess(appUser?.userLevel, 'operator') ||
           hasPermission('time.manage') || hasPermission('time:manage');
  };

  return {
    // 基本權限檢查
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 頁面權限檢查
    canAccess,
    canManage,
    
    // 角色檢查
    isAdmin,
    isManager,
    isForeman,
    isTimekeeper,
    
    // 級別檢查函數
    hasAccess: (requiredLevel: UserLevel) => hasAccess(appUser?.userLevel, requiredLevel),

    // 用戶資訊
    userRole: appUser?.roleName || '未設定',
    userLevel: appUser?.userLevel || 'viewer',
    userPermissions: appUser?.permissions || [],
  };
}

/**
 * 頁面權限檢查 Hook
 * 用於檢查當前頁面的權限
 */
export function usePagePermission(pathname: string) {
  const { canAccess, canManage } = usePermission();

  return {
    canAccessPage: canAccess(pathname),
    canManagePage: canManage(pathname),
  };
}