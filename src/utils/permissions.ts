// src/utils/permissions.ts
/**
 * 前端權限管理 - 權限常數和輔助函數
 */

// ==================== 權限定義 ====================
// 這些權限定義必須與後端的 permissions.ts 保持一致

export const PERMISSIONS = {
  // 團隊管理
  PERSONNEL_VIEW: 'personnel.view',           // 查看成員資料
  PERSONNEL_MANAGE: 'personnel.manage',       // 新增/編輯/刪除成員
  TIME_VIEW: 'time.view',                     // 查看工時統計
  TIME_MANAGE: 'time.manage',                 // 管理工時記錄
  
  // 供應鏈
  SUPPLIERS_VIEW: 'suppliers.view',           // 查看供應商
  SUPPLIERS_MANAGE: 'suppliers.manage',       // 管理供應商
  PURCHASE_VIEW: 'purchase.view',             // 查看採購訂單
  PURCHASE_MANAGE: 'purchase.manage',         // 管理採購訂單
  
  // 生產中心
  MATERIALS_VIEW: 'materials.view',           // 查看原料庫
  MATERIALS_MANAGE: 'materials.manage',       // 管理原料庫
  FRAGRANCES_VIEW: 'fragrances.view',         // 查看配方庫
  FRAGRANCES_MANAGE: 'fragrances.manage',     // 管理配方庫
  PRODUCTS_VIEW: 'products.view',             // 查看產品目錄
  PRODUCTS_MANAGE: 'products.manage',         // 管理產品目錄
  WORK_ORDERS_VIEW: 'workOrders.view',        // 查看生產工單
  WORK_ORDERS_MANAGE: 'workOrders.manage',    // 管理生產工單
  
  // 營運分析
  INVENTORY_VIEW: 'inventory.view',           // 查看庫存監控
  INVENTORY_MANAGE: 'inventory.manage',       // 管理庫存
  INVENTORY_RECORDS_VIEW: 'inventoryRecords.view', // 查看庫存歷史
  COST_VIEW: 'cost.view',                     // 查看成本分析
  TIME_REPORTS_VIEW: 'timeReports.view',      // 查看工時報表
  
  // 系統管理
  ROLES_MANAGE: 'roles.manage',               // 管理角色權限
  SYSTEM_SETTINGS: 'system.settings',        // 系統設定
} as const;

// 所有權限陣列
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ==================== 頁面權限對應 ====================

/**
 * 頁面路徑與所需權限的對應
 */
export interface PagePermissionConfig {
  /** 查看頁面所需權限（至少需要其中一個） */
  view: string[];
  /** 編輯功能所需權限（至少需要其中一個） */
  manage?: string[];
}

export const PAGE_PERMISSIONS: Record<string, PagePermissionConfig> = {
  // 工作台 - 所有人都能看
  '/dashboard': {
    view: [],
  },
  
  // 團隊管理
  '/dashboard/personnel': {
    view: [PERMISSIONS.PERSONNEL_VIEW, PERMISSIONS.PERSONNEL_MANAGE],
    manage: [PERMISSIONS.PERSONNEL_MANAGE],
  },
  '/dashboard/personnel/permissions': {
    view: [PERMISSIONS.ROLES_MANAGE],
    manage: [PERMISSIONS.ROLES_MANAGE],
  },
  '/dashboard/time-records': {
    view: [PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_MANAGE],
  },
  
  // 供應鏈
  '/dashboard/suppliers': {
    view: [PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.SUPPLIERS_MANAGE],
    manage: [PERMISSIONS.SUPPLIERS_MANAGE],
  },
  '/dashboard/purchase-orders': {
    view: [PERMISSIONS.PURCHASE_VIEW, PERMISSIONS.PURCHASE_MANAGE],
    manage: [PERMISSIONS.PURCHASE_MANAGE],
  },
  
  // 生產中心
  '/dashboard/materials': {
    view: [PERMISSIONS.MATERIALS_VIEW, PERMISSIONS.MATERIALS_MANAGE],
    manage: [PERMISSIONS.MATERIALS_MANAGE],
  },
  '/dashboard/fragrances': {
    view: [PERMISSIONS.FRAGRANCES_VIEW, PERMISSIONS.FRAGRANCES_MANAGE],
    manage: [PERMISSIONS.FRAGRANCES_MANAGE],
  },
  '/dashboard/products': {
    view: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE],
    manage: [PERMISSIONS.PRODUCTS_MANAGE],
  },
  '/dashboard/work-orders': {
    view: [PERMISSIONS.WORK_ORDERS_VIEW, PERMISSIONS.WORK_ORDERS_MANAGE],
    manage: [PERMISSIONS.WORK_ORDERS_MANAGE],
  },
  '/dashboard/work-orders/create': {
    view: [PERMISSIONS.WORK_ORDERS_MANAGE],
    manage: [PERMISSIONS.WORK_ORDERS_MANAGE],
  },
  
  // 營運分析
  '/dashboard/inventory': {
    view: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE],
    manage: [PERMISSIONS.INVENTORY_MANAGE],
  },
  '/dashboard/inventory-records': {
    view: [PERMISSIONS.INVENTORY_RECORDS_VIEW],
  },
  '/dashboard/cost-management': {
    view: [PERMISSIONS.COST_VIEW],
  },
  '/dashboard/time-reports': {
    view: [PERMISSIONS.TIME_REPORTS_VIEW],
  },
  
  // 其他頁面
  '/dashboard/material-categories': {
    view: [PERMISSIONS.MATERIALS_VIEW, PERMISSIONS.MATERIALS_MANAGE],
    manage: [PERMISSIONS.MATERIALS_MANAGE],
  },
  '/dashboard/product-series': {
    view: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE],
    manage: [PERMISSIONS.PRODUCTS_MANAGE],
  },
  '/dashboard/production-calculator': {
    view: [PERMISSIONS.PRODUCTS_VIEW], // 只需要產品查看權限
  },
  '/dashboard/inventory-old': {
    view: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE],
    manage: [PERMISSIONS.INVENTORY_MANAGE],
  },
};

// ==================== 輔助函數 ====================

/**
 * 檢查使用者是否可以訪問特定頁面
 * @param pathname 頁面路徑
 * @param userPermissions 使用者權限陣列
 * @returns 是否有權限訪問
 */
export function canAccessPage(pathname: string, userPermissions: string[]): boolean {
  const pageConfig = PAGE_PERMISSIONS[pathname];
  
  // 如果頁面沒有權限配置，預設允許訪問
  if (!pageConfig) return true;
  
  // 如果查看權限為空，表示所有人都可以訪問
  if (pageConfig.view.length === 0) return true;
  
  // 檢查是否有任一查看權限
  return pageConfig.view.some(permission => userPermissions.includes(permission));
}

/**
 * 檢查使用者是否可以編輯特定頁面
 * @param pathname 頁面路徑
 * @param userPermissions 使用者權限陣列
 * @returns 是否有編輯權限
 */
export function canManagePage(pathname: string, userPermissions: string[]): boolean {
  const pageConfig = PAGE_PERMISSIONS[pathname];
  
  // 如果沒有管理權限配置，預設不允許編輯
  if (!pageConfig?.manage) return false;
  
  // 檢查是否有任一管理權限
  return pageConfig.manage.some(permission => userPermissions.includes(permission));
}

/**
 * 取得權限的顯示名稱
 */
export const PERMISSION_NAMES: Record<string, string> = {
  [PERMISSIONS.PERSONNEL_VIEW]: '查看成員資料',
  [PERMISSIONS.PERSONNEL_MANAGE]: '管理成員資料',
  [PERMISSIONS.TIME_VIEW]: '查看工時統計',
  [PERMISSIONS.TIME_MANAGE]: '管理工時記錄',
  [PERMISSIONS.SUPPLIERS_VIEW]: '查看供應商',
  [PERMISSIONS.SUPPLIERS_MANAGE]: '管理供應商',
  [PERMISSIONS.PURCHASE_VIEW]: '查看採購訂單',
  [PERMISSIONS.PURCHASE_MANAGE]: '管理採購訂單',
  [PERMISSIONS.MATERIALS_VIEW]: '查看原料庫',
  [PERMISSIONS.MATERIALS_MANAGE]: '管理原料庫',
  [PERMISSIONS.FRAGRANCES_VIEW]: '查看配方庫',
  [PERMISSIONS.FRAGRANCES_MANAGE]: '管理配方庫',
  [PERMISSIONS.PRODUCTS_VIEW]: '查看產品目錄',
  [PERMISSIONS.PRODUCTS_MANAGE]: '管理產品目錄',
  [PERMISSIONS.WORK_ORDERS_VIEW]: '查看生產工單',
  [PERMISSIONS.WORK_ORDERS_MANAGE]: '管理生產工單',
  [PERMISSIONS.INVENTORY_VIEW]: '查看庫存監控',
  [PERMISSIONS.INVENTORY_MANAGE]: '管理庫存',
  [PERMISSIONS.INVENTORY_RECORDS_VIEW]: '查看庫存歷史',
  [PERMISSIONS.COST_VIEW]: '查看成本分析',
  [PERMISSIONS.TIME_REPORTS_VIEW]: '查看工時報表',
  [PERMISSIONS.ROLES_MANAGE]: '管理角色權限',
  [PERMISSIONS.SYSTEM_SETTINGS]: '系統設定',
};

/**
 * 取得權限顯示名稱
 * @param permission 權限ID
 * @returns 顯示名稱
 */
export function getPermissionName(permission: string): string {
  return PERMISSION_NAMES[permission] || permission;
}