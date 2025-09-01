// functions/src/api/roles.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureCanManageRoles, ensureCanManagePersonnel } from "../utils/auth";
import { DEFAULT_ROLES, Role } from "../utils/permissions";

const db = getFirestore();

export const createRole = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  const { name, description, permissions } = data;
  
  if (!name || !permissions || !Array.isArray(permissions)) {
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (角色名稱、權限列表)。");
  }

  try {
    // 檢查角色名稱是否已存在
    const existingRoles = await db.collection("roles")
      .where("name", "==", name)
      .get();
    
    if (!existingRoles.empty) {
      throw new HttpsError("already-exists", "角色名稱已存在，請使用不同的名稱。");
    }

    const roleData = {
      name,
      description: description || "",
      permissions,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: contextAuth?.uid
    };

    const docRef = await db.collection("roles").add(roleData);
    
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新角色: ${name} (${docRef.id})`);
    
    return {
      status: "success",
      message: `角色 ${name} 已成功建立。`,
      roleId: docRef.id
    };
  } catch (error) {
    logger.error("建立角色時發生錯誤:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "建立角色時發生未知錯誤。");
  }
});

export const updateRole = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  const { roleId, name, description, permissions } = data;
  
  if (!roleId || !name || !permissions || !Array.isArray(permissions)) {
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (角色ID、角色名稱、權限列表)。");
  }

  try {
    const roleRef = db.collection("roles").doc(roleId);
    const roleDoc = await roleRef.get();
    
    if (!roleDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的角色。");
    }

    // 檢查角色名稱是否已被其他角色使用
    const existingRoles = await db.collection("roles")
      .where("name", "==", name)
      .get();
    
    const nameExists = existingRoles.docs.some(doc => doc.id !== roleId);
    if (nameExists) {
      throw new HttpsError("already-exists", "角色名稱已存在，請使用不同的名稱。");
    }

    const updateData = {
      name,
      description: description || "",
      permissions,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: contextAuth?.uid
    };

    await roleRef.update(updateData);
    
    logger.info(`管理員 ${contextAuth?.uid} 成功更新角色: ${name} (${roleId})`);
    
    return {
      status: "success",
      message: `角色 ${name} 已成功更新。`
    };
  } catch (error) {
    logger.error(`更新角色 ${roleId} 時發生錯誤:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "更新角色時發生未知錯誤。");
  }
});

export const checkRoleUsage = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  const { roleId } = data;
  
  if (!roleId) {
    throw new HttpsError("invalid-argument", "請求缺少角色ID。");
  }

  try {
    const roleRef = db.collection("roles").doc(roleId);
    const roleDoc = await roleRef.get();
    
    if (!roleDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的角色。");
    }

    // 檢查有多少使用者正在使用此角色
    const usersWithRole = await db.collection("users")
      .where("roleRef", "==", roleRef)
      .get();
    
    const userCount = usersWithRole.size;
    
    logger.info(`檢查角色 ${roleId} 使用情況: ${userCount} 個使用者`);
    
    return {
      status: "success",
      userCount,
      canDelete: userCount === 0
    };
  } catch (error) {
    logger.error(`檢查角色 ${roleId} 使用情況時發生錯誤:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "檢查角色使用情況時發生未知錯誤。");
  }
});

export const deleteRole = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  const { roleId } = data;
  
  if (!roleId) {
    throw new HttpsError("invalid-argument", "請求缺少角色ID。");
  }

  try {
    const roleRef = db.collection("roles").doc(roleId);
    const roleDoc = await roleRef.get();
    
    if (!roleDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的角色。");
    }

    // 檢查是否有使用者正在使用此角色
    const usersWithRole = await db.collection("users")
      .where("roleRef", "==", roleRef)
      .get();
    
    if (!usersWithRole.empty) {
      throw new HttpsError("failed-precondition", `無法刪除角色，因為還有 ${usersWithRole.size} 個使用者正在使用此角色。`);
    }

    await roleRef.delete();
    
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除角色: ${roleId}`);
    
    return {
      status: "success",
      message: "角色已成功刪除。"
    };
  } catch (error) {
    logger.error(`刪除角色 ${roleId} 時發生錯誤:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "刪除角色時發生未知錯誤。");
  }
});

/**
 * 初始化預設角色
 * 僅在角色集合為空時執行
 */
export const initializeDefaultRoles = onCall(async (request) => {
  const { auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  try {
    // 檢查是否已有角色存在
    const existingRoles = await db.collection("roles").get();
    
    if (!existingRoles.empty) {
      logger.info("角色已存在，跳過初始化");
      return {
        status: "skipped",
        message: "系統已有角色存在，跳過初始化",
        existingCount: existingRoles.size
      };
    }

    // 初始化預設角色
    const batch = db.batch();
    const createdRoles: string[] = [];

    for (const role of DEFAULT_ROLES) {
      const roleRef = db.collection("roles").doc(role.id);
      const roleData: Role = {
        ...role,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      batch.set(roleRef, roleData);
      createdRoles.push(role.displayName);
    }

    await batch.commit();
    
    logger.info(`成功初始化預設角色: ${createdRoles.join(', ')}`);
    
    return {
      status: "success",
      message: `成功初始化 ${createdRoles.length} 個預設角色`,
      roles: createdRoles
    };
  } catch (error) {
    logger.error("初始化預設角色時發生錯誤:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "初始化預設角色時發生未知錯誤。");
  }
});

/**
 * 取得所有角色列表
 */
export const getRoles = onCall(async (request) => {
  const { auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  try {
    const rolesSnapshot = await db.collection("roles")
      .orderBy("createdAt", "asc")
      .get();
    
    const roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`查詢角色列表成功，共 ${roles.length} 個角色`);
    
    return {
      status: "success",
      roles: roles
    };
  } catch (error) {
    logger.error("查詢角色列表時發生錯誤:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "查詢角色列表時發生未知錯誤。");
  }
});

/**
 * 取得角色詳細資訊
 */
export const getRole = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManageRoles(contextAuth?.uid);
  
  const { roleId } = data;
  
  if (!roleId) {
    throw new HttpsError("invalid-argument", "請求缺少角色ID。");
  }

  try {
    const roleDoc = await db.collection("roles").doc(roleId).get();
    
    if (!roleDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的角色。");
    }

    const roleData = {
      id: roleDoc.id,
      ...roleDoc.data()
    };
    
    logger.info(`查詢角色詳情成功: ${roleId}`);
    
    return {
      status: "success",
      role: roleData
    };
  } catch (error) {
    logger.error(`查詢角色詳情時發生錯誤: ${roleId}`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "查詢角色詳情時發生未知錯誤。");
  }
});

/**
 * 指派角色給使用者
 */
export const assignUserRole = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManagePersonnel(contextAuth?.uid);
  
  const { userId, roleId } = data;
  
  if (!userId || !roleId) {
    throw new HttpsError("invalid-argument", "請求缺少使用者ID或角色ID。");
  }

  try {
    // 檢查角色是否存在
    const roleRef = db.collection("roles").doc(roleId);
    const roleDoc = await roleRef.get();
    
    if (!roleDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的角色。");
    }

    // 檢查使用者是否存在
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的使用者。");
    }

    // 更新使用者角色
    await userRef.update({
      roleRef: roleRef,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: contextAuth?.uid
    });

    const roleName = roleDoc.data()?.displayName || roleId;
    const userName = userDoc.data()?.name || userId;
    
    logger.info(`成功指派角色: ${userName} -> ${roleName}`);
    
    return {
      status: "success",
      message: `成功將角色 ${roleName} 指派給 ${userName}`
    };
  } catch (error) {
    logger.error(`指派角色時發生錯誤: ${userId} -> ${roleId}`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "指派角色時發生未知錯誤。");
  }
});

