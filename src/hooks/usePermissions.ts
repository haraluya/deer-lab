// src/hooks/usePermissions.ts
import { useAuth } from '@/context/AuthContext';

export const usePermissions = () => {
  const { appUser } = useAuth();

  // 檢查是否有指定權限
  const hasPermission = (permission: string): boolean => {
    if (!appUser?.permissions) return false;
    return appUser.permissions.includes(permission);
  };

  // 檢查是否有任一權限
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!appUser?.permissions) return false;
    return permissions.some(permission => appUser.permissions!.includes(permission));
  };

  // 檢查是否有所有權限
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!appUser?.permissions) return false;
    return permissions.every(permission => appUser.permissions!.includes(permission));
  };

  // 人員管理權限
  const canManagePersonnel = (): boolean => {
    return hasAnyPermission([
      'personnel:create',
      'personnel:edit', 
      'personnel:delete',
      'personnel:view',
      '新增人員',
      '編輯人員',
      '刪除人員',
      '查看人員管理'
    ]);
  };

  // 角色管理權限
  const canManageRoles = (): boolean => {
    return hasAnyPermission([
      'roles:create',
      'roles:edit',
      'roles:delete',
      'roles:view',
      '新增角色',
      '編輯角色',
      '刪除角色',
      '查看角色管理'
    ]);
  };

  // 材料管理權限
  const canManageMaterials = (): boolean => {
    return hasAnyPermission([
      'materials:create',
      'materials:edit',
      'materials:delete',
      'materials:view',
      '新增材料',
      '編輯材料',
      '刪除材料',
      '查看材料管理'
    ]);
  };

  // 香精管理權限
  const canManageFragrances = (): boolean => {
    return hasAnyPermission([
      'fragrances:create',
      'fragrances:edit',
      'fragrances:delete',
      'fragrances:view',
      '新增香精',
      '編輯香精',
      '刪除香精',
      '查看香精管理'
    ]);
  };

  // 產品管理權限
  const canManageProducts = (): boolean => {
    return hasAnyPermission([
      'products:create',
      'products:edit',
      'products:delete',
      'products:view',
      '新增產品',
      '編輯產品',
      '刪除產品',
      '查看產品管理'
    ]);
  };

  // 工單管理權限
  const canManageWorkOrders = (): boolean => {
    return hasAnyPermission([
      'workorders:create',
      'workorders:edit',
      'workorders:delete',
      'workorders:view',
      '新增工單',
      '編輯工單',
      '刪除工單',
      '查看工單管理'
    ]);
  };

  // 庫存管理權限
  const canManageInventory = (): boolean => {
    return hasAnyPermission([
      'inventory:view',
      'inventory:adjust',
      '查看庫存',
      '調整庫存'
    ]);
  };

  // 採購管理權限
  const canManagePurchase = (): boolean => {
    return hasAnyPermission([
      'purchase:create',
      'purchase:edit',
      'purchase:delete',
      'purchase:view',
      'purchase:receive',
      '新增採購單',
      '編輯採購單',
      '刪除採購單',
      '查看採購單',
      '接收採購單'
    ]);
  };

  // 報表查看權限
  const canViewReports = (): boolean => {
    return hasPermission('reports:view') || hasPermission('查看報表');
  };

  // 成本管理權限
  const canManageCost = (): boolean => {
    return hasPermission('cost:view') || hasPermission('查看成本管理');
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
