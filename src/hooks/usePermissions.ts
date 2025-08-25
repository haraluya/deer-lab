// src/hooks/usePermissions.ts
import { useAuth } from '@/context/AuthContext';

export const usePermissions = () => {
  const { appUser } = useAuth();

  const hasPermission = (requiredPermission: string): boolean => {
    if (!appUser?.permissions) {
      console.log('❌ 用戶沒有權限資料');
      return false;
    }

    const hasPermission = appUser.permissions.includes(requiredPermission);
    console.log(`🔍 權限檢查: ${requiredPermission} - ${hasPermission ? '✅' : '❌'}`);
    return hasPermission;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!appUser?.permissions) {
      console.log('❌ 用戶沒有權限資料');
      console.log('👤 當前 appUser:', appUser);
      return false;
    }

    const hasAny = permissions.some(permission => appUser.permissions!.includes(permission));
    console.log(`🔍 權限檢查 (任一): ${permissions.join(', ')} - ${hasAny ? '✅' : '❌'}`);
    console.log('📋 用戶權限列表:', appUser.permissions);
    return hasAny;
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!appUser?.permissions) {
      console.log('❌ 用戶沒有權限資料');
      return false;
    }

    const hasAll = permissions.every(permission => appUser.permissions!.includes(permission));
    console.log(`🔍 權限檢查 (全部): ${permissions.join(', ')} - ${hasAll ? '✅' : '❌'}`);
    return hasAll;
  };

  // 人員管理權限檢查
  const canManagePersonnel = (): boolean => {
    console.log('🔍 檢查人員管理權限...');
    console.log('👤 當前用戶:', appUser?.name);
    console.log('🎭 當前角色:', appUser?.roleName);
    console.log('📋 當前權限:', appUser?.permissions);
    
    const personnelPermissions = [
      'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
      '新增人員', '編輯人員', '刪除人員', '查看人員管理'
    ];
    const result = hasAnyPermission(personnelPermissions);
    console.log(`🎯 canManagePersonnel() 結果: ${result}`);
    return result;
  };

  // 角色管理權限檢查
  const canManageRoles = (): boolean => {
    const rolePermissions = [
      'roles:create', 'roles:edit', 'roles:delete', 'roles:view',
      '新增角色', '編輯角色', '刪除角色', '查看角色管理'
    ];
    return hasAnyPermission(rolePermissions);
  };

  // 物料管理權限檢查
  const canManageMaterials = (): boolean => {
    const materialPermissions = [
      'materials:create', 'materials:edit', 'materials:delete', 'materials:view',
      '新增物料', '編輯物料', '刪除物料', '查看物料管理'
    ];
    return hasAnyPermission(materialPermissions);
  };

  // 產品管理權限檢查
  const canManageProducts = (): boolean => {
    const productPermissions = [
      'products:create', 'products:edit', 'products:delete', 'products:view',
      '新增產品', '編輯產品', '刪除產品', '查看產品管理'
    ];
    return hasAnyPermission(productPermissions);
  };

  // 工單管理權限檢查
  const canManageWorkOrders = (): boolean => {
    const workOrderPermissions = [
      'workorders:create', 'workorders:edit', 'workorders:delete', 'workorders:view',
      '新增工單', '編輯工單', '刪除工單', '查看工單管理'
    ];
    return hasAnyPermission(workOrderPermissions);
  };

  // 供應商管理權限檢查
  const canManageSuppliers = (): boolean => {
    const supplierPermissions = [
      'suppliers:create', 'suppliers:edit', 'suppliers:delete', 'suppliers:view',
      '新增供應商', '編輯供應商', '刪除供應商', '查看供應商管理'
    ];
    return hasAnyPermission(supplierPermissions);
  };

  // 採購管理權限檢查
  const canManagePurchaseOrders = (): boolean => {
    const purchasePermissions = [
      'purchase:create', 'purchase:edit', 'purchase:delete', 'purchase:view',
      '新增採購單', '編輯採購單', '刪除採購單', '查看採購管理'
    ];
    return hasAnyPermission(purchasePermissions);
  };

  // 庫存管理權限檢查
  const canManageInventory = (): boolean => {
    const inventoryPermissions = [
      'inventory:view', 'inventory:adjust',
      '查看庫存管理', '調整庫存'
    ];
    return hasAnyPermission(inventoryPermissions);
  };

  // 報表查看權限檢查
  const canViewReports = (): boolean => {
    const reportPermissions = [
      'reports:view', '查看報表分析'
    ];
    return hasAnyPermission(reportPermissions);
  };

  // 成本管理權限檢查
  const canViewCostManagement = (): boolean => {
    const costPermissions = [
      'cost:view', '查看成本管理'
    ];
    return hasAnyPermission(costPermissions);
  };

  // 香精管理權限檢查
  const canManageFragrances = (): boolean => {
    const fragrancePermissions = [
      'fragrances:create', 'fragrances:edit', 'fragrances:delete', 'fragrances:view',
      '新增香精', '編輯香精', '刪除香精', '查看香精管理'
    ];
    return hasAnyPermission(fragrancePermissions);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManagePersonnel,
    canManageRoles,
    canManageMaterials,
    canManageProducts,
    canManageWorkOrders,
    canManageSuppliers,
    canManagePurchaseOrders,
    canManageInventory,
    canViewReports,
    canViewCostManagement,
    canManageFragrances,
    userPermissions: appUser?.permissions || [],
    roleName: appUser?.roleName,
  };
};
