// functions/src/api/personnel.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureCanManagePersonnel } from "../utils/auth";

const db = getFirestore();
const auth = getAuth();

export const createPersonnel = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManagePersonnel(contextAuth?.uid);
  
  const { name, employeeId, phone, roleId, password, status } = data;
  
  if (!name || !employeeId || !phone || !roleId || !password || !status) {
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (姓名、員工編號、電話、角色、密碼、狀態)。");
  }

  try {
    // 檢查員工編號是否已存在
    const existingUsers = await db.collection("users")
      .where("employeeId", "==", employeeId)
      .get();
    
    if (!existingUsers.empty) {
      throw new HttpsError("already-exists", "員工編號已存在，請使用不同的編號。");
    }



    // 創建 Firebase Auth 用戶
    const authData = {
      uid: employeeId,
      password: password,
      displayName: name,
      disabled: status === "inactive"
    };

    const userRecord = await auth.createUser(authData);

    // 創建角色引用
    const roleRef = db.collection("roles").doc(roleId);
    
    // 儲存到 Firestore
    const personnelData = {
      name,
      employeeId,
      phone,
      roleRef,
      status,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: contextAuth?.uid
    };

    await db.collection("users").doc(userRecord.uid).set(personnelData);
    
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新人員: ${name} (${employeeId})`);
    
    return {
      status: "success",
      message: `人員 ${name} 已成功建立。`,
      uid: userRecord.uid
    };
  } catch (error) {
    logger.error("建立人員時發生錯誤:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "建立人員時發生未知錯誤。");
  }
});

export const updatePersonnel = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManagePersonnel(contextAuth?.uid);
  
  const { personnelId, name, employeeId, phone, roleId, password, status } = data;
  
  if (!personnelId || !name || !employeeId || !phone || !roleId || !status) {
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (人員ID、姓名、員工編號、電話、角色、狀態)。");
  }

  try {
    const userRef = db.collection("users").doc(personnelId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的人員。");
    }

    // 檢查員工編號是否已被其他用戶使用
    const existingUsers = await db.collection("users")
      .where("employeeId", "==", employeeId)
      .get();
    
    const employeeIdExists = existingUsers.docs.some(doc => doc.id !== personnelId);
    if (employeeIdExists) {
      throw new HttpsError("already-exists", "員工編號已存在，請使用不同的編號。");
    }



    // 更新 Firebase Auth 用戶
    const updateAuthData: {
      displayName: string;
      disabled: boolean;
      password?: string;
    } = {
      displayName: name,
      disabled: status === "inactive"
    };

    // 如果提供了新密碼，則更新密碼
    if (password) {
      updateAuthData.password = password;
    }

    await auth.updateUser(personnelId, updateAuthData);

    // 創建角色引用
    const roleRef = db.collection("roles").doc(roleId);
    
    // 更新 Firestore 資料
    const updateData = {
      name,
      employeeId,
      phone,
      roleRef,
      status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: contextAuth?.uid
    };

    await userRef.update(updateData);
    
    logger.info(`管理員 ${contextAuth?.uid} 成功更新人員: ${name} (${personnelId})`);
    
    return {
      status: "success",
      message: `人員 ${name} 已成功更新。`
    };
  } catch (error) {
    logger.error(`更新人員 ${personnelId} 時發生錯誤:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "更新人員時發生未知錯誤。");
  }
});

export const deletePersonnel = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureCanManagePersonnel(contextAuth?.uid);
  
  const { personnelId } = data;
  
  if (!personnelId) {
    throw new HttpsError("invalid-argument", "請求缺少人員ID。");
  }

  if (personnelId === contextAuth?.uid) {
    throw new HttpsError("failed-precondition", "無法刪除自己的帳號。");
  }

  try {
    const userRef = db.collection("users").doc(personnelId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "找不到指定的人員。");
    }

    // 刪除 Firebase Auth 用戶
    await auth.deleteUser(personnelId);
    
    // 刪除 Firestore 資料
    await userRef.delete();
    
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除人員: ${personnelId}`);
    
    return {
      status: "success",
      message: "人員已成功刪除。"
    };
  } catch (error) {
    logger.error(`刪除人員 ${personnelId} 時發生錯誤:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "刪除人員時發生未知錯誤。");
  }
});
