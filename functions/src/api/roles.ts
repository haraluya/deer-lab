// functions/src/api/roles.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

export const createRole = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureIsAdmin(contextAuth?.uid);
  
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
  // await ensureIsAdmin(contextAuth?.uid);
  
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
  // await ensureIsAdmin(contextAuth?.uid);
  
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
  // await ensureIsAdmin(contextAuth?.uid);
  
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

