// functions/src/utils/auth.ts
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 檢查使用者是否具有特定權限
 * @param {string | undefined} uid 使用者ID
 * @param {string} requiredPermission 需要的權限
 */
export const checkPermission = async (uid: string | undefined, requiredPermission: string) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "請求未經驗證，必須登入才能執行此操作。");
  }
  
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "找不到發出請求的使用者資料。");
  }
  
  const roleRef = userDoc.data()?.roleRef;
  if (!roleRef) {
    throw new HttpsError("permission-denied", "使用者沒有指派角色，權限不足。");
  }
  
  const roleDoc = await roleRef.get();
  if (!roleDoc.exists) {
    throw new HttpsError("permission-denied", "找不到使用者角色資料。");
  }
  
  const roleData = roleDoc.data();
  const permissions = roleData?.permissions || [];
  
  // 檢查是否具有所需權限
  if (!permissions.includes(requiredPermission)) {
    console.log(`權限檢查失敗: 使用者 ${uid} 需要權限 ${requiredPermission}，但只有權限:`, permissions);
    throw new HttpsError("permission-denied", `權限不足，需要權限: ${requiredPermission}`);
  }
  
  console.log(`權限檢查成功: 使用者 ${uid} 具有權限 ${requiredPermission}`);
  return true;
};

/**
 * 檢查使用者是否具有人員管理權限（新增、編輯、刪除人員）
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManagePersonnel = async (uid: string | undefined) => {
  // 檢查是否具有任何人員管理權限（支援中文和英文格式）
  const personnelPermissions = [
    // 中文格式
    "新增人員", "編輯人員", "刪除人員", "查看人員管理",
    // 英文格式
    "personnel:create", "personnel:edit", "personnel:delete", "personnel:view"
  ];
  
  for (const permission of personnelPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有人員管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要人員管理權限（新增人員、編輯人員、刪除人員或查看人員管理）");
};

/**
 * 檢查使用者是否具有角色管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageRoles = async (uid: string | undefined) => {
  const rolePermissions = [
    "新增角色", "編輯角色", "刪除角色", "查看角色管理",
    "roles:create", "roles:edit", "roles:delete", "roles:view"
  ];
  
  for (const permission of rolePermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有角色管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要角色管理權限");
};

/**
 * 檢查使用者是否具有物料管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageMaterials = async (uid: string | undefined) => {
  const materialPermissions = [
    "新增物料", "編輯物料", "刪除物料", "查看物料管理",
    "materials:create", "materials:edit", "materials:delete", "materials:view"
  ];
  
  for (const permission of materialPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有物料管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要物料管理權限");
};

/**
 * 檢查使用者是否具有產品管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageProducts = async (uid: string | undefined) => {
  const productPermissions = [
    "新增產品", "編輯產品", "刪除產品", "查看產品管理",
    "products:create", "products:edit", "products:delete", "products:view"
  ];
  
  for (const permission of productPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有產品管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要產品管理權限");
};

/**
 * 檢查使用者是否具有工單管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageWorkOrders = async (uid: string | undefined) => {
  const workOrderPermissions = [
    "新增工單", "編輯工單", "刪除工單", "查看工單管理",
    "workorders:create", "workorders:edit", "workorders:delete", "workorders:view"
  ];
  
  for (const permission of workOrderPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有工單管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要工單管理權限");
};

/**
 * 檢查使用者是否具有供應商管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageSuppliers = async (uid: string | undefined) => {
  const supplierPermissions = [
    "新增供應商", "編輯供應商", "刪除供應商", "查看供應商管理",
    "suppliers:create", "suppliers:edit", "suppliers:delete", "suppliers:view"
  ];
  
  for (const permission of supplierPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有供應商管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要供應商管理權限");
};

/**
 * 檢查使用者是否具有採購管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManagePurchaseOrders = async (uid: string | undefined) => {
  const purchasePermissions = [
    "新增採購單", "編輯採購單", "刪除採購單", "查看採購管理",
    "purchase:create", "purchase:edit", "purchase:delete", "purchase:view"
  ];
  
  for (const permission of purchasePermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有採購管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要採購管理權限");
};

/**
 * 檢查使用者是否具有庫存管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageInventory = async (uid: string | undefined) => {
  const inventoryPermissions = [
    "查看庫存管理", "調整庫存",
    "inventory:view", "inventory:adjust"
  ];
  
  for (const permission of inventoryPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有庫存管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要庫存管理權限");
};

/**
 * 檢查使用者是否具有報表查看權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewReports = async (uid: string | undefined) => {
  const reportPermissions = [
    "查看報表分析", "reports:view"
  ];
  
  for (const permission of reportPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有報表查看權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要報表查看權限");
};

/**
 * 檢查使用者是否具有成本管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanViewCostManagement = async (uid: string | undefined) => {
  const costPermissions = [
    "查看成本管理", "cost:view"
  ];
  
  for (const permission of costPermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有成本管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要成本管理權限");
};

/**
 * 檢查使用者是否具有香精管理權限
 * @param {string | undefined} uid 使用者ID
 */
export const ensureCanManageFragrances = async (uid: string | undefined) => {
  const fragrancePermissions = [
    "新增香精", "編輯香精", "刪除香精", "查看香精管理",
    "fragrances:create", "fragrances:edit", "fragrances:delete", "fragrances:view"
  ];
  
  for (const permission of fragrancePermissions) {
    try {
      await checkPermission(uid, permission);
      console.log(`✅ 使用者 ${uid} 具有香精管理權限: ${permission}`);
      return true;
    } catch (error) {
      console.log(`❌ 使用者 ${uid} 沒有權限: ${permission}`);
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足，需要香精管理權限");
};

// 為了向後兼容，保留舊的函數名稱
/**
 * @deprecated 使用 ensureCanManagePersonnel 替代
 */
export const ensureIsAdmin = async (uid: string | undefined) => {
  return ensureCanManagePersonnel(uid);
};

/**
 * @deprecated 使用具體的權限檢查函數替代
 */
export const ensureIsAdminOrForeman = async (uid: string | undefined) => {
  // 檢查是否具有工單管理權限（領班通常可以管理工單）
  return ensureCanManageWorkOrders(uid);
};
