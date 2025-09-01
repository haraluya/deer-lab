// src/hooks/usePermission.ts
/**
 * 權限檢查相關 Hook
 */

import { useAuth } from '@/context/AuthContext';
import { canAccessPage, canManagePage } from '@/utils/permissions';

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
   * 檢查是否為系統管理員
   * @returns 是否為管理員
   */
  const isAdmin = (): boolean => {
    // 檢查多種可能的管理員角色名稱
    const adminRoleNames = ['系統管理員', '管理員', 'admin', 'Admin', 'ADMIN'];
    const currentRole = appUser?.roleName || '';
    
    // 支援新舊權限格式
    const hasRoleManagePermission = hasPermission('roles.manage') || 
                                   hasPermission('roles:manage') ||
                                   hasPermission('roles:create') ||
                                   hasPermission('roles:edit') ||
                                   hasPermission('roles:delete');
    
    return adminRoleNames.includes(currentRole) || hasRoleManagePermission;
  };

  /**
   * 檢查是否為生產領班
   * @returns 是否為領班
   */
  const isForeman = (): boolean => {
    const foremanRoleNames = ['生產領班', '領班', 'foreman', 'Foreman', '主管'];
    const currentRole = appUser?.roleName || '';
    return foremanRoleNames.includes(currentRole) || hasPermission('workOrders.manage');
  };

  /**
   * 檢查是否為計時人員
   * @returns 是否為計時人員
   */
  const isTimekeeper = (): boolean => {
    const timekeeperRoleNames = ['計時人員', '時間記錄員', 'timekeeper', 'Timekeeper'];
    const currentRole = appUser?.roleName || '';
    return timekeeperRoleNames.includes(currentRole) || 
           (hasPermission('time.manage') && !hasPermission('personnel.manage'));
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
    isForeman,
    isTimekeeper,
    
    // 用戶資訊
    userRole: appUser?.roleName || '未設定',
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