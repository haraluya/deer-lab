// src/hooks/usePermissions.ts
import { useAuth } from '@/context/AuthContext';

export const usePermissions = () => {
  const { appUser } = useAuth();

  // 檢查是否有指定權限 - 現在所有人都返回 true
  const hasPermission = (permission: string): boolean => {
    return true; // 所有人都有所有權限
  };

  // 檢查是否有任一權限 - 現在所有人都返回 true
  const hasAnyPermission = (permissions: string[]): boolean => {
    return true; // 所有人都有所有權限
  };

  // 檢查是否有所有權限 - 現在所有人都返回 true
  const hasAllPermissions = (permissions: string[]): boolean => {
    return true; // 所有人都有所有權限
  };

  // 人員管理權限 - 現在所有人都返回 true
  const canManagePersonnel = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 角色管理權限 - 現在所有人都返回 true
  const canManageRoles = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 材料管理權限 - 現在所有人都返回 true
  const canManageMaterials = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 香精管理權限 - 現在所有人都返回 true
  const canManageFragrances = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 產品管理權限 - 現在所有人都返回 true
  const canManageProducts = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 工單管理權限 - 現在所有人都返回 true
  const canManageWorkOrders = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 庫存管理權限 - 現在所有人都返回 true
  const canManageInventory = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 採購管理權限 - 現在所有人都返回 true
  const canManagePurchase = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 報表查看權限 - 現在所有人都返回 true
  const canViewReports = (): boolean => {
    return true; // 所有人都有所有權限
  };

  // 成本管理權限 - 現在所有人都返回 true
  const canManageCost = (): boolean => {
    return true; // 所有人都有所有權限
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManagePersonnel,
    canManageRoles,
    canManageMaterials,
    canManageFragrances,
    canManageProducts,
    canManageWorkOrders,
    canManageInventory,
    canManagePurchase,
    canViewReports,
    canManageCost,
    // 當前用戶資訊
    currentUser: appUser,
    permissions: appUser?.permissions || [],
    roleName: appUser?.roleName
  };
};
