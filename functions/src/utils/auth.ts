// functions/src/utils/auth.ts
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, DocumentReference } from "firebase-admin/firestore";
import { hasPermission, PERMISSIONS } from "./permissions";

const db = getFirestore();

/**
 * 檢查使用者是否具有特定權限
 * @param {string | undefined} uid 使用者ID
 * @param {string} requiredPermission 需要的權限
 */
export const checkPermission = async (uid: string | undefined, requiredPermission: string): Promise<boolean> => {
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
    const roleRef = userData?.roleRef as DocumentReference;

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
    const permissions = roleData?.permissions || [];

    // 檢查權限
    const hasRequiredPermission = hasPermission(permissions, requiredPermission);
    
    if (hasRequiredPermission) {
      console.log(`✅ 權限檢查通過: 使用者 ${uid} 具有權限 ${requiredPermission}`);
    } else {
      console.log(`❌ 權限檢查失敗: 使用者 ${uid} 缺少權限 ${requiredPermission}`);
    }

    return hasRequiredPermission;
  } catch (error) {
    console.error(`❌ 權限檢查錯誤: 使用者 ${uid}, 權限 ${requiredPermission}`, error);
    return false;
  }
};

/**
 * 輔助函數：確保使用者具有特定權限，否則拋出錯誤
 * @param uid 使用者ID
 * @param requiredPermission 需要的權限
 */
const ensurePermission = async (uid: string | undefined, requiredPermission: string) => {
  const hasRequiredPermission = await checkPermission(uid, requiredPermission);
  if (!hasRequiredPermission) {
    throw new HttpsError("permission-denied", `您沒有執行此操作的權限 (${requiredPermission})`);
  }
};

/**
 * 檢查使用者是否具有人員管理權限（新增、編輯、刪除人員）
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManagePersonnel = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.PERSONNEL_MANAGE);
};

/**
 * 檢查使用者是否可以查看人員資料
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewPersonnel = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.PERSONNEL_VIEW);
};

/**
 * 檢查使用者是否具有角色管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageRoles = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.ROLES_MANAGE);
};

/**
 * 檢查使用者是否具有物料管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageMaterials = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.MATERIALS_MANAGE);
};

/**
 * 檢查使用者是否可以查看物料
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewMaterials = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.MATERIALS_VIEW);
};

/**
 * 檢查使用者是否具有產品管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageProducts = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.PRODUCTS_MANAGE);
};

/**
 * 檢查使用者是否可以查看產品
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewProducts = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.PRODUCTS_VIEW);
};

/**
 * 檢查使用者是否具有工單管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageWorkOrders = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.WORK_ORDERS_MANAGE);
};

/**
 * 檢查使用者是否可以查看工單
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewWorkOrders = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.WORK_ORDERS_VIEW);
};

/**
 * 檢查使用者是否具有供應商管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageSuppliers = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.SUPPLIERS_MANAGE);
};

/**
 * 檢查使用者是否可以查看供應商
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewSuppliers = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.SUPPLIERS_VIEW);
};

/**
 * 檢查使用者是否具有採購管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManagePurchaseOrders = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.PURCHASE_MANAGE);
};

/**
 * 檢查使用者是否可以查看採購訂單
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewPurchaseOrders = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.PURCHASE_VIEW);
};

/**
 * 檢查使用者是否具有庫存管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageInventory = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.INVENTORY_MANAGE);
};

/**
 * 檢查使用者是否可以查看庫存
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewInventory = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.INVENTORY_VIEW);
};

/**
 * 檢查使用者是否可以查看庫存記錄
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewInventoryRecords = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.INVENTORY_RECORDS_VIEW);
};

/**
 * 檢查使用者是否具有報表查看權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewReports = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.TIME_REPORTS_VIEW);
};

/**
 * 檢查使用者是否具有成本管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewCostManagement = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.COST_VIEW);
};

/**
 * 檢查使用者是否具有香精管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageFragrances = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.FRAGRANCES_MANAGE);
};

/**
 * 檢查使用者是否可以查看香精
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewFragrances = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.FRAGRANCES_VIEW);
};

/**
 * 檢查使用者是否具有工時管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageTime = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.TIME_MANAGE);
};

/**
 * 檢查使用者是否可以查看工時
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewTime = async (uid: string | undefined) => {
  await ensurePermission(uid, PERMISSIONS.TIME_VIEW);
};

// 為了向後相容，保留舊的函數名稱
/**
 * @deprecated 使用具體的權限檢查函數替代
 */
export const ensureIsAdmin = async (uid: string | undefined) => {
  // 檢查是否為系統管理員角色
  await ensurePermission(uid, PERMISSIONS.ROLES_MANAGE);
};

/**
 * @deprecated 使用具體的權限檢查函數替代
 */
export const ensureIsAdminOrForeman = async (uid: string | undefined) => {
  // 檢查是否有工單管理權限（系統管理員和生產領班都有）
  await ensurePermission(uid, PERMISSIONS.WORK_ORDERS_MANAGE);
};