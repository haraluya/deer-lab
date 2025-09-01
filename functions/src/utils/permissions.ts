// functions/src/utils/permissions.ts
/**
 * 權限管理系統 - 權限定義與角色配置
 */

// ==================== 權限定義 ====================

/**
 * 系統所有權限定義
 * 格式：模組.動作
 */
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

// 權限陣列（用於迭代）
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ==================== 角色定義 ====================

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  color: string; // 用於 UI 顯示
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 預設角色配置
 */
export const DEFAULT_ROLES: Role[] = [
  // 系統管理員 - 全部權限
  {
    id: 'admin',
    name: 'admin',
    displayName: '系統管理員',
    description: '擁有系統全部權限，可管理所有功能和用戶',
    permissions: ALL_PERMISSIONS,
    isDefault: true,
    color: '#dc2626', // red-600
  },
  
  // 生產領班 - 生產相關權限，無成員管理
  {
    id: 'foreman',
    name: 'foreman',
    displayName: '生產領班',
    description: '負責生產管理，可管理工單、物料、產品，無成員管理權限',
    permissions: [
      // 供應鏈（查看）
      PERMISSIONS.SUPPLIERS_VIEW,
      PERMISSIONS.PURCHASE_VIEW,
      PERMISSIONS.PURCHASE_MANAGE,
      
      // 生產中心（全權限）
      PERMISSIONS.MATERIALS_VIEW,
      PERMISSIONS.MATERIALS_MANAGE,
      PERMISSIONS.FRAGRANCES_VIEW,
      PERMISSIONS.FRAGRANCES_MANAGE,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.WORK_ORDERS_VIEW,
      PERMISSIONS.WORK_ORDERS_MANAGE,
      
      // 營運分析（查看權限）
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_RECORDS_VIEW,
      PERMISSIONS.COST_VIEW,
      PERMISSIONS.TIME_REPORTS_VIEW,
      
      // 工時相關
      PERMISSIONS.TIME_VIEW,
      PERMISSIONS.TIME_MANAGE,
    ],
    isDefault: true,
    color: '#2563eb', // blue-600
  },
  
  // 計時人員 - 僅查看和工時相關功能
  {
    id: 'timekeeper',
    name: 'timekeeper',
    displayName: '計時人員',
    description: '主要負責工時記錄，可查看生產資料但無法編輯，無法查看營運分析和供應鏈',
    permissions: [
      // 生產中心（僅查看）
      PERMISSIONS.MATERIALS_VIEW,
      PERMISSIONS.FRAGRANCES_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.WORK_ORDERS_VIEW,
      
      // 工時相關（完整權限）
      PERMISSIONS.TIME_VIEW,
      PERMISSIONS.TIME_MANAGE,
    ],
    isDefault: true,
    color: '#059669', // green-600
  },
];

// ==================== 權限分組（用於 UI 顯示）====================

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'team',
    name: '團隊管理',
    description: '成員管理和工時相關功能',
    permissions: [
      {
        id: PERMISSIONS.PERSONNEL_VIEW,
        name: '查看成員資料',
        description: '可以查看所有成員的基本資訊'
      },
      {
        id: PERMISSIONS.PERSONNEL_MANAGE,
        name: '管理成員資料',
        description: '新增、編輯、刪除成員資料'
      },
      {
        id: PERMISSIONS.TIME_VIEW,
        name: '查看工時統計',
        description: '查看個人和團隊工時統計'
      },
      {
        id: PERMISSIONS.TIME_MANAGE,
        name: '管理工時記錄',
        description: '新增、編輯工時記錄'
      },
    ]
  },
  {
    id: 'supply',
    name: '供應鏈',
    description: '供應商和採購管理',
    permissions: [
      {
        id: PERMISSIONS.SUPPLIERS_VIEW,
        name: '查看供應商',
        description: '查看供應商資訊和聯繫方式'
      },
      {
        id: PERMISSIONS.SUPPLIERS_MANAGE,
        name: '管理供應商',
        description: '新增、編輯、刪除供應商'
      },
      {
        id: PERMISSIONS.PURCHASE_VIEW,
        name: '查看採購訂單',
        description: '查看採購訂單狀態和明細'
      },
      {
        id: PERMISSIONS.PURCHASE_MANAGE,
        name: '管理採購訂單',
        description: '建立、修改採購訂單'
      },
    ]
  },
  {
    id: 'production',
    name: '生產中心',
    description: '物料、配方、產品和工單管理',
    permissions: [
      {
        id: PERMISSIONS.MATERIALS_VIEW,
        name: '查看原料庫',
        description: '查看物料庫存和規格'
      },
      {
        id: PERMISSIONS.MATERIALS_MANAGE,
        name: '管理原料庫',
        description: '新增、編輯物料資訊'
      },
      {
        id: PERMISSIONS.FRAGRANCES_VIEW,
        name: '查看配方庫',
        description: '查看香精配方和庫存'
      },
      {
        id: PERMISSIONS.FRAGRANCES_MANAGE,
        name: '管理配方庫',
        description: '新增、編輯香精配方'
      },
      {
        id: PERMISSIONS.PRODUCTS_VIEW,
        name: '查看產品目錄',
        description: '查看產品資訊和配方'
      },
      {
        id: PERMISSIONS.PRODUCTS_MANAGE,
        name: '管理產品目錄',
        description: '新增、編輯產品和配方'
      },
      {
        id: PERMISSIONS.WORK_ORDERS_VIEW,
        name: '查看生產工單',
        description: '查看工單狀態和進度'
      },
      {
        id: PERMISSIONS.WORK_ORDERS_MANAGE,
        name: '管理生產工單',
        description: '建立、修改工單'
      },
    ]
  },
  {
    id: 'analytics',
    name: '營運分析',
    description: '庫存、成本和報表查看',
    permissions: [
      {
        id: PERMISSIONS.INVENTORY_VIEW,
        name: '查看庫存監控',
        description: '查看即時庫存狀態'
      },
      {
        id: PERMISSIONS.INVENTORY_MANAGE,
        name: '管理庫存',
        description: '調整庫存數量和設定'
      },
      {
        id: PERMISSIONS.INVENTORY_RECORDS_VIEW,
        name: '查看庫存歷史',
        description: '查看庫存變更記錄'
      },
      {
        id: PERMISSIONS.COST_VIEW,
        name: '查看成本分析',
        description: '查看成本統計和分析'
      },
      {
        id: PERMISSIONS.TIME_REPORTS_VIEW,
        name: '查看工時報表',
        description: '查看工時統計報表'
      },
    ]
  },
  {
    id: 'system',
    name: '系統管理',
    description: '角色權限和系統設定',
    permissions: [
      {
        id: PERMISSIONS.ROLES_MANAGE,
        name: '管理角色權限',
        description: '建立、修改角色和權限分配'
      },
      {
        id: PERMISSIONS.SYSTEM_SETTINGS,
        name: '系統設定',
        description: '修改系統參數和設定'
      },
    ]
  },
];

// ==================== 輔助函數 ====================

/**
 * 檢查角色是否具有特定權限
 * @param role 角色物件
 * @param permission 權限名稱
 * @returns boolean
 */
export function roleHasPermission(role: Role, permission: string): boolean {
  return role.permissions.includes(permission);
}

/**
 * 檢查權限列表是否包含特定權限
 * @param permissions 權限陣列
 * @param requiredPermission 需要的權限
 * @returns boolean
 */
export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  return permissions.includes(requiredPermission);
}

/**
 * 根據角色名稱取得預設角色
 * @param roleName 角色名稱
 * @returns Role | undefined
 */
export function getDefaultRoleByName(roleName: string): Role | undefined {
  return DEFAULT_ROLES.find(role => role.name === roleName);
}

/**
 * 取得角色的顏色類別
 * @param roleName 角色名稱
 * @returns string
 */
export function getRoleColor(roleName: string): string {
  const role = getDefaultRoleByName(roleName);
  return role?.color || '#6b7280'; // 預設為 gray-500
}

/**
 * 驗證權限是否有效
 * @param permission 權限名稱
 * @returns boolean
 */
export function isValidPermission(permission: string): boolean {
  return ALL_PERMISSIONS.includes(permission as any);
}

/**
 * 取得權限的顯示名稱
 * @param permission 權限名稱
 * @returns string
 */
export function getPermissionDisplayName(permission: string): string {
  for (const group of PERMISSION_GROUPS) {
    const perm = group.permissions.find(p => p.id === permission);
    if (perm) {
      return perm.name;
    }
  }
  return permission;
}