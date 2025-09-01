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
    if (!appUser?.permissions) return false;
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
    return appUser?.roleName === '系統管理員';
  };

  /**
   * 檢查是否為生產領班
   * @returns 是否為領班
   */
  const isForeman = (): boolean => {
    return appUser?.roleName === '生產領班';
  };

  /**
   * 檢查是否為計時人員
   * @returns 是否為計時人員
   */
  const isTimekeeper = (): boolean => {
    return appUser?.roleName === '計時人員';
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