"use strict";
// functions/src/utils/permissions.ts
/**
 * 權限管理系統 - 權限定義與角色配置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermissionDisplayName = exports.isValidPermission = exports.getRoleColor = exports.getDefaultRoleByName = exports.hasPermission = exports.roleHasPermission = exports.PERMISSION_GROUPS = exports.DEFAULT_ROLES = exports.ALL_PERMISSIONS = exports.PERMISSIONS = void 0;
// ==================== 權限定義 ====================
/**
 * 系統所有權限定義
 * 格式：模組.動作
 */
exports.PERMISSIONS = {
    // 團隊管理
    PERSONNEL_VIEW: 'personnel.view',
    PERSONNEL_MANAGE: 'personnel.manage',
    TIME_VIEW: 'time.view',
    TIME_MANAGE: 'time.manage',
    // 供應鏈
    SUPPLIERS_VIEW: 'suppliers.view',
    SUPPLIERS_MANAGE: 'suppliers.manage',
    PURCHASE_VIEW: 'purchase.view',
    PURCHASE_MANAGE: 'purchase.manage',
    // 生產中心
    MATERIALS_VIEW: 'materials.view',
    MATERIALS_MANAGE: 'materials.manage',
    FRAGRANCES_VIEW: 'fragrances.view',
    FRAGRANCES_MANAGE: 'fragrances.manage',
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_MANAGE: 'products.manage',
    WORK_ORDERS_VIEW: 'workOrders.view',
    WORK_ORDERS_MANAGE: 'workOrders.manage',
    // 營運分析
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_MANAGE: 'inventory.manage',
    INVENTORY_RECORDS_VIEW: 'inventoryRecords.view',
    COST_VIEW: 'cost.view',
    TIME_REPORTS_VIEW: 'timeReports.view',
    // 系統管理
    ROLES_MANAGE: 'roles.manage',
    SYSTEM_SETTINGS: 'system.settings', // 系統設定
};
// 權限陣列（用於迭代）
exports.ALL_PERMISSIONS = Object.values(exports.PERMISSIONS);
/**
 * 預設角色配置
 */
exports.DEFAULT_ROLES = [
    // 系統管理員 - 全部權限
    {
        id: 'admin',
        name: 'admin',
        displayName: '系統管理員',
        description: '擁有系統全部權限，可管理所有功能和用戶',
        permissions: exports.ALL_PERMISSIONS,
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
            exports.PERMISSIONS.SUPPLIERS_VIEW,
            exports.PERMISSIONS.PURCHASE_VIEW,
            exports.PERMISSIONS.PURCHASE_MANAGE,
            // 生產中心（全權限）
            exports.PERMISSIONS.MATERIALS_VIEW,
            exports.PERMISSIONS.MATERIALS_MANAGE,
            exports.PERMISSIONS.FRAGRANCES_VIEW,
            exports.PERMISSIONS.FRAGRANCES_MANAGE,
            exports.PERMISSIONS.PRODUCTS_VIEW,
            exports.PERMISSIONS.PRODUCTS_MANAGE,
            exports.PERMISSIONS.WORK_ORDERS_VIEW,
            exports.PERMISSIONS.WORK_ORDERS_MANAGE,
            // 營運分析（查看權限）
            exports.PERMISSIONS.INVENTORY_VIEW,
            exports.PERMISSIONS.INVENTORY_MANAGE,
            exports.PERMISSIONS.INVENTORY_RECORDS_VIEW,
            exports.PERMISSIONS.COST_VIEW,
            exports.PERMISSIONS.TIME_REPORTS_VIEW,
            // 工時相關
            exports.PERMISSIONS.TIME_VIEW,
            exports.PERMISSIONS.TIME_MANAGE,
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
            exports.PERMISSIONS.MATERIALS_VIEW,
            exports.PERMISSIONS.FRAGRANCES_VIEW,
            exports.PERMISSIONS.PRODUCTS_VIEW,
            exports.PERMISSIONS.WORK_ORDERS_VIEW,
            // 工時相關（完整權限）
            exports.PERMISSIONS.TIME_VIEW,
            exports.PERMISSIONS.TIME_MANAGE,
        ],
        isDefault: true,
        color: '#059669', // green-600
    },
];
exports.PERMISSION_GROUPS = [
    {
        id: 'team',
        name: '團隊管理',
        description: '成員管理和工時相關功能',
        permissions: [
            {
                id: exports.PERMISSIONS.PERSONNEL_VIEW,
                name: '查看成員資料',
                description: '可以查看所有成員的基本資訊'
            },
            {
                id: exports.PERMISSIONS.PERSONNEL_MANAGE,
                name: '管理成員資料',
                description: '新增、編輯、刪除成員資料'
            },
            {
                id: exports.PERMISSIONS.TIME_VIEW,
                name: '查看工時統計',
                description: '查看個人和團隊工時統計'
            },
            {
                id: exports.PERMISSIONS.TIME_MANAGE,
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
                id: exports.PERMISSIONS.SUPPLIERS_VIEW,
                name: '查看供應商',
                description: '查看供應商資訊和聯繫方式'
            },
            {
                id: exports.PERMISSIONS.SUPPLIERS_MANAGE,
                name: '管理供應商',
                description: '新增、編輯、刪除供應商'
            },
            {
                id: exports.PERMISSIONS.PURCHASE_VIEW,
                name: '查看採購訂單',
                description: '查看採購訂單狀態和明細'
            },
            {
                id: exports.PERMISSIONS.PURCHASE_MANAGE,
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
                id: exports.PERMISSIONS.MATERIALS_VIEW,
                name: '查看原料庫',
                description: '查看物料庫存和規格'
            },
            {
                id: exports.PERMISSIONS.MATERIALS_MANAGE,
                name: '管理原料庫',
                description: '新增、編輯物料資訊'
            },
            {
                id: exports.PERMISSIONS.FRAGRANCES_VIEW,
                name: '查看配方庫',
                description: '查看香精配方和庫存'
            },
            {
                id: exports.PERMISSIONS.FRAGRANCES_MANAGE,
                name: '管理配方庫',
                description: '新增、編輯香精配方'
            },
            {
                id: exports.PERMISSIONS.PRODUCTS_VIEW,
                name: '查看產品目錄',
                description: '查看產品資訊和配方'
            },
            {
                id: exports.PERMISSIONS.PRODUCTS_MANAGE,
                name: '管理產品目錄',
                description: '新增、編輯產品和配方'
            },
            {
                id: exports.PERMISSIONS.WORK_ORDERS_VIEW,
                name: '查看生產工單',
                description: '查看工單狀態和進度'
            },
            {
                id: exports.PERMISSIONS.WORK_ORDERS_MANAGE,
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
                id: exports.PERMISSIONS.INVENTORY_VIEW,
                name: '查看庫存監控',
                description: '查看即時庫存狀態'
            },
            {
                id: exports.PERMISSIONS.INVENTORY_MANAGE,
                name: '管理庫存',
                description: '調整庫存數量和設定'
            },
            {
                id: exports.PERMISSIONS.INVENTORY_RECORDS_VIEW,
                name: '查看庫存歷史',
                description: '查看庫存變更記錄'
            },
            {
                id: exports.PERMISSIONS.COST_VIEW,
                name: '查看成本分析',
                description: '查看成本統計和分析'
            },
            {
                id: exports.PERMISSIONS.TIME_REPORTS_VIEW,
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
                id: exports.PERMISSIONS.ROLES_MANAGE,
                name: '管理角色權限',
                description: '建立、修改角色和權限分配'
            },
            {
                id: exports.PERMISSIONS.SYSTEM_SETTINGS,
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
function roleHasPermission(role, permission) {
    return role.permissions.includes(permission);
}
exports.roleHasPermission = roleHasPermission;
/**
 * 檢查權限列表是否包含特定權限
 * @param permissions 權限陣列
 * @param requiredPermission 需要的權限
 * @returns boolean
 */
function hasPermission(permissions, requiredPermission) {
    return permissions.includes(requiredPermission);
}
exports.hasPermission = hasPermission;
/**
 * 根據角色名稱取得預設角色
 * @param roleName 角色名稱
 * @returns Role | undefined
 */
function getDefaultRoleByName(roleName) {
    return exports.DEFAULT_ROLES.find(role => role.name === roleName);
}
exports.getDefaultRoleByName = getDefaultRoleByName;
/**
 * 取得角色的顏色類別
 * @param roleName 角色名稱
 * @returns string
 */
function getRoleColor(roleName) {
    const role = getDefaultRoleByName(roleName);
    return (role === null || role === void 0 ? void 0 : role.color) || '#6b7280'; // 預設為 gray-500
}
exports.getRoleColor = getRoleColor;
/**
 * 驗證權限是否有效
 * @param permission 權限名稱
 * @returns boolean
 */
function isValidPermission(permission) {
    return exports.ALL_PERMISSIONS.includes(permission);
}
exports.isValidPermission = isValidPermission;
/**
 * 取得權限的顯示名稱
 * @param permission 權限名稱
 * @returns string
 */
function getPermissionDisplayName(permission) {
    for (const group of exports.PERMISSION_GROUPS) {
        const perm = group.permissions.find(p => p.id === permission);
        if (perm) {
            return perm.name;
        }
    }
    return permission;
}
exports.getPermissionDisplayName = getPermissionDisplayName;
//# sourceMappingURL=permissions.js.map