// functions/src/utils/auth.ts
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 檢查使用者是否具有特定權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 * @param {string} requiredPermission 需要的權限
 */
export const checkPermission = async (uid: string | undefined, requiredPermission: string) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 權限檢查通過: 使用者 ${uid} 具有權限 ${requiredPermission} (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有人員管理權限（新增、編輯、刪除人員） - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManagePersonnel = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有人員管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有角色管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageRoles = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有角色管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有物料管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageMaterials = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有物料管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有產品管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageProducts = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有產品管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有工單管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageWorkOrders = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有工單管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有供應商管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageSuppliers = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有供應商管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有採購管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManagePurchaseOrders = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有採購管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有庫存管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageInventory = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有庫存管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有報表查看權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewReports = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有報表查看權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有成本管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewCostManagement = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有成本管理權限 (所有人都有所有權限)`);
  return true;
};

/**
 * 檢查使用者是否具有香精管理權限 - 現在所有人都返回 true
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageFragrances = async (uid: string | undefined) => {
  // 所有人都有所有權限，直接返回 true
  console.log(`✅ 使用者 ${uid} 具有香精管理權限 (所有人都有所有權限)`);
  return true;
};

// 為了向後兼容，保留舊的函數名稱
/**
 * @deprecated 使用 ensureCanManagePersonnel 替代
 */
export const ensureIsAdmin = async (uid: string | undefined) => {
  return true; // 所有人都有所有權限
};

/**
 * @deprecated 使用具體的權限檢查函數替代
 */
export const ensureIsAdminOrForeman = async (uid: string | undefined) => {
  return true; // 所有人都有所有權限
};