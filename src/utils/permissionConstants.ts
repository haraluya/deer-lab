// src/utils/permissionConstants.ts
/**
 * 前端權限管理 - 權限分組和常數定義（複製自後端）
 */

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
        id: 'personnel.view',
        name: '查看成員資料',
        description: '可以查看所有成員的基本資訊'
      },
      {
        id: 'personnel.manage',
        name: '管理成員資料',
        description: '新增、編輯、刪除成員資料'
      },
      {
        id: 'time.view',
        name: '查看工時統計',
        description: '查看個人和團隊工時統計'
      },
      {
        id: 'time.manage',
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
        id: 'suppliers.view',
        name: '查看供應商',
        description: '查看供應商資訊和聯繫方式'
      },
      {
        id: 'suppliers.manage',
        name: '管理供應商',
        description: '新增、編輯、刪除供應商'
      },
      {
        id: 'purchase.view',
        name: '查看採購訂單',
        description: '查看採購訂單狀態和明細'
      },
      {
        id: 'purchase.manage',
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
        id: 'materials.view',
        name: '查看原料庫',
        description: '查看物料庫存和規格'
      },
      {
        id: 'materials.manage',
        name: '管理原料庫',
        description: '新增、編輯物料資訊'
      },
      {
        id: 'fragrances.view',
        name: '查看配方庫',
        description: '查看香精配方和庫存'
      },
      {
        id: 'fragrances.manage',
        name: '管理配方庫',
        description: '新增、編輯香精配方'
      },
      {
        id: 'products.view',
        name: '查看產品目錄',
        description: '查看產品資訊和配方'
      },
      {
        id: 'products.manage',
        name: '管理產品目錄',
        description: '新增、編輯產品和配方'
      },
      {
        id: 'workOrders.view',
        name: '查看生產工單',
        description: '查看工單狀態和進度'
      },
      {
        id: 'workOrders.manage',
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
        id: 'inventory.view',
        name: '查看庫存監控',
        description: '查看即時庫存狀態'
      },
      {
        id: 'inventory.manage',
        name: '管理庫存',
        description: '調整庫存數量和設定'
      },
      {
        id: 'inventoryRecords.view',
        name: '查看庫存歷史',
        description: '查看庫存變更記錄'
      },
      {
        id: 'cost.view',
        name: '查看成本分析',
        description: '查看成本統計和分析'
      },
      {
        id: 'timeReports.view',
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
        id: 'roles.manage',
        name: '管理角色權限',
        description: '建立、修改角色和權限分配'
      },
      {
        id: 'system.settings',
        name: '系統設定',
        description: '修改系統參數和設定'
      },
    ]
  },
];