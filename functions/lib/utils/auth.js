"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureIsAdminOrForeman = exports.ensureIsAdmin = exports.ensureCanViewTime = exports.ensureCanManageTime = exports.ensureCanViewFragrances = exports.ensureCanManageFragrances = exports.ensureCanViewCostManagement = exports.ensureCanViewReports = exports.ensureCanViewInventoryRecords = exports.ensureCanViewInventory = exports.ensureCanManageInventory = exports.ensureCanViewPurchaseOrders = exports.ensureCanManagePurchaseOrders = exports.ensureCanViewSuppliers = exports.ensureCanManageSuppliers = exports.ensureCanViewWorkOrders = exports.ensureCanManageWorkOrders = exports.ensureCanViewProducts = exports.ensureCanManageProducts = exports.ensureCanViewMaterials = exports.ensureCanManageMaterials = exports.ensureCanManageRoles = exports.ensureCanViewPersonnel = exports.ensureCanManagePersonnel = exports.checkPermission = void 0;
// functions/src/utils/auth.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const permissions_1 = require("./permissions");
const db = (0, firestore_1.getFirestore)();
/**
 * 檢查使用者是否具有特定權限
 * @param {string | undefined} uid 使用者ID
 * @param {string} requiredPermission 需要的權限
 */
const checkPermission = async (uid, requiredPermission) => {
    if (!uid) {
        console.log(`❌ 權限檢查失敗: 使用者未登入`);
        return false;
    }
    try {
        // 取得使用者資料
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.log(`❌ 權限檢查失敗: 找不到使用者 ${uid}`);
            return false;
        }
        const userData = userDoc.data();
        const roleRef = userData === null || userData === void 0 ? void 0 : userData.roleRef;
        if (!roleRef) {
            console.log(`❌ 權限檢查失敗: 使用者 ${uid} 沒有角色`);
            return false;
        }
        // 取得角色資料
        const roleDoc = await roleRef.get();
        if (!roleDoc.exists) {
            console.log(`❌ 權限檢查失敗: 角色不存在 ${roleRef.id}`);
            return false;
        }
        const roleData = roleDoc.data();
        const permissions = (roleData === null || roleData === void 0 ? void 0 : roleData.permissions) || [];
        // 檢查權限
        const hasRequiredPermission = (0, permissions_1.hasPermission)(permissions, requiredPermission);
        if (hasRequiredPermission) {
            console.log(`✅ 權限檢查通過: 使用者 ${uid} 具有權限 ${requiredPermission}`);
        }
        else {
            console.log(`❌ 權限檢查失敗: 使用者 ${uid} 缺少權限 ${requiredPermission}`);
        }
        return hasRequiredPermission;
    }
    catch (error) {
        console.error(`❌ 權限檢查錯誤: 使用者 ${uid}, 權限 ${requiredPermission}`, error);
        return false;
    }
};
exports.checkPermission = checkPermission;
/**
 * 輔助函數：確保使用者具有特定權限，否則拋出錯誤
 * @param uid 使用者ID
 * @param requiredPermission 需要的權限
 */
const ensurePermission = async (uid, requiredPermission) => {
    const hasRequiredPermission = await (0, exports.checkPermission)(uid, requiredPermission);
    if (!hasRequiredPermission) {
        throw new https_1.HttpsError("permission-denied", `您沒有執行此操作的權限 (${requiredPermission})`);
    }
};
/**
 * 檢查使用者是否具有人員管理權限（新增、編輯、刪除人員）
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManagePersonnel = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.PERSONNEL_MANAGE);
};
exports.ensureCanManagePersonnel = ensureCanManagePersonnel;
/**
 * 檢查使用者是否可以查看人員資料
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewPersonnel = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.PERSONNEL_VIEW);
};
exports.ensureCanViewPersonnel = ensureCanViewPersonnel;
/**
 * 檢查使用者是否具有角色管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageRoles = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.ROLES_MANAGE);
};
exports.ensureCanManageRoles = ensureCanManageRoles;
/**
 * 檢查使用者是否具有物料管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageMaterials = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.MATERIALS_MANAGE);
};
exports.ensureCanManageMaterials = ensureCanManageMaterials;
/**
 * 檢查使用者是否可以查看物料
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewMaterials = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.MATERIALS_VIEW);
};
exports.ensureCanViewMaterials = ensureCanViewMaterials;
/**
 * 檢查使用者是否具有產品管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageProducts = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.PRODUCTS_MANAGE);
};
exports.ensureCanManageProducts = ensureCanManageProducts;
/**
 * 檢查使用者是否可以查看產品
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewProducts = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.PRODUCTS_VIEW);
};
exports.ensureCanViewProducts = ensureCanViewProducts;
/**
 * 檢查使用者是否具有工單管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageWorkOrders = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.WORK_ORDERS_MANAGE);
};
exports.ensureCanManageWorkOrders = ensureCanManageWorkOrders;
/**
 * 檢查使用者是否可以查看工單
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewWorkOrders = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.WORK_ORDERS_VIEW);
};
exports.ensureCanViewWorkOrders = ensureCanViewWorkOrders;
/**
 * 檢查使用者是否具有供應商管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageSuppliers = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.SUPPLIERS_MANAGE);
};
exports.ensureCanManageSuppliers = ensureCanManageSuppliers;
/**
 * 檢查使用者是否可以查看供應商
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewSuppliers = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.SUPPLIERS_VIEW);
};
exports.ensureCanViewSuppliers = ensureCanViewSuppliers;
/**
 * 檢查使用者是否具有採購管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManagePurchaseOrders = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.PURCHASE_MANAGE);
};
exports.ensureCanManagePurchaseOrders = ensureCanManagePurchaseOrders;
/**
 * 檢查使用者是否可以查看採購訂單
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewPurchaseOrders = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.PURCHASE_VIEW);
};
exports.ensureCanViewPurchaseOrders = ensureCanViewPurchaseOrders;
/**
 * 檢查使用者是否具有庫存管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageInventory = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.INVENTORY_MANAGE);
};
exports.ensureCanManageInventory = ensureCanManageInventory;
/**
 * 檢查使用者是否可以查看庫存
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewInventory = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.INVENTORY_VIEW);
};
exports.ensureCanViewInventory = ensureCanViewInventory;
/**
 * 檢查使用者是否可以查看庫存記錄
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewInventoryRecords = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.INVENTORY_RECORDS_VIEW);
};
exports.ensureCanViewInventoryRecords = ensureCanViewInventoryRecords;
/**
 * 檢查使用者是否具有報表查看權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewReports = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.TIME_REPORTS_VIEW);
};
exports.ensureCanViewReports = ensureCanViewReports;
/**
 * 檢查使用者是否具有成本管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewCostManagement = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.COST_VIEW);
};
exports.ensureCanViewCostManagement = ensureCanViewCostManagement;
/**
 * 檢查使用者是否具有香精管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageFragrances = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.FRAGRANCES_MANAGE);
};
exports.ensureCanManageFragrances = ensureCanManageFragrances;
/**
 * 檢查使用者是否可以查看香精
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewFragrances = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.FRAGRANCES_VIEW);
};
exports.ensureCanViewFragrances = ensureCanViewFragrances;
/**
 * 檢查使用者是否具有工時管理權限
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanManageTime = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.TIME_MANAGE);
};
exports.ensureCanManageTime = ensureCanManageTime;
/**
 * 檢查使用者是否可以查看工時
 * @param {string | undefined} uid 使用者ID
 */
const ensureCanViewTime = async (uid) => {
    await ensurePermission(uid, permissions_1.PERMISSIONS.TIME_VIEW);
};
exports.ensureCanViewTime = ensureCanViewTime;
// 為了向後相容，保留舊的函數名稱
/**
 * @deprecated 使用具體的權限檢查函數替代
 */
const ensureIsAdmin = async (uid) => {
    // 檢查是否為系統管理員角色
    await ensurePermission(uid, permissions_1.PERMISSIONS.ROLES_MANAGE);
};
exports.ensureIsAdmin = ensureIsAdmin;
/**
 * @deprecated 使用具體的權限檢查函數替代
 */
const ensureIsAdminOrForeman = async (uid) => {
    // 檢查是否有工單管理權限（系統管理員和生產領班都有）
    await ensurePermission(uid, permissions_1.PERMISSIONS.WORK_ORDERS_MANAGE);
};
exports.ensureIsAdminOrForeman = ensureIsAdminOrForeman;
//# sourceMappingURL=auth.js.map