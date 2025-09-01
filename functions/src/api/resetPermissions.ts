// functions/src/api/resetPermissions.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError, CallableOptions } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ALL_PERMISSIONS } from "../utils/permissions";

// CORS 設定選項
const corsOptions: CallableOptions = {
  cors: true
};

const db = getFirestore();

/**
 * 臨時權限重置功能 - 僅用於緊急修復
 * 清除所有角色並為指定用戶設定完整權限
 */
export const resetPermissionsSystem = onCall(corsOptions, async (request) => {
  const { data, auth: contextAuth } = request;
  
  if (!contextAuth?.uid) {
    throw new HttpsError("unauthenticated", "需要登入才能執行重置操作");
  }
  
  const { targetEmployeeId } = data;
  
  if (!targetEmployeeId) {
    throw new HttpsError("invalid-argument", "請提供目標用戶的員工編號");
  }

  try {
    logger.info(`開始權限系統重置，目標員工編號: ${targetEmployeeId}`);
    
    // 1. 清除所有角色
    const rolesSnapshot = await db.collection("roles").get();
    const roleDeleteBatch = db.batch();
    
    rolesSnapshot.docs.forEach((doc) => {
      roleDeleteBatch.delete(doc.ref);
    });
    
    if (!rolesSnapshot.empty) {
      await roleDeleteBatch.commit();
      logger.info(`已清除 ${rolesSnapshot.size} 個角色`);
    }
    
    // 2. 清除所有用戶的角色引用
    const usersSnapshot = await db.collection("users").get();
    const userUpdateBatch = db.batch();
    
    usersSnapshot.docs.forEach((doc) => {
      userUpdateBatch.update(doc.ref, {
        roleRef: FieldValue.delete(),
        roleName: "未設定",
        permissions: [],
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    if (!usersSnapshot.empty) {
      await userUpdateBatch.commit();
      logger.info(`已清除 ${usersSnapshot.size} 個用戶的角色引用`);
    }
    
    // 3. 為目標員工編號設定完整權限
    const targetUserSnapshot = await db.collection("users")
      .where("employeeId", "==", targetEmployeeId)
      .get();
    
    if (targetUserSnapshot.empty) {
      throw new HttpsError("not-found", `找不到員工編號為 ${targetEmployeeId} 的用戶`);
    }
    
    const targetUserDoc = targetUserSnapshot.docs[0];
    await targetUserDoc.ref.update({
      roleName: "系統管理員",
      permissions: ALL_PERMISSIONS,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: contextAuth.uid,
      resetBy: `${contextAuth.uid} (${new Date().toISOString()})`
    });
    
    const targetUserData = targetUserDoc.data();
    logger.info(`已為用戶 ${targetUserData.name} (${targetEmployeeId}) 設定完整權限`);
    
    return {
      status: "success",
      message: `權限系統重置完成。用戶 ${targetUserData.name} (${targetEmployeeId}) 已獲得完整管理員權限。`,
      details: {
        rolesCleared: rolesSnapshot.size,
        usersUpdated: usersSnapshot.size,
        targetUser: {
          name: targetUserData.name,
          employeeId: targetEmployeeId,
          permissionCount: ALL_PERMISSIONS.length
        }
      }
    };
  } catch (error) {
    logger.error("權限系統重置失敗:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "權限系統重置時發生未知錯誤。");
  }
});

/**
 * 快速指派管理員權限給指定員工編號
 */
export const grantAdminPermissions = onCall(corsOptions, async (request) => {
  const { data, auth: contextAuth } = request;
  
  if (!contextAuth?.uid) {
    throw new HttpsError("unauthenticated", "需要登入才能執行操作");
  }
  
  const { targetEmployeeId } = data;
  
  if (!targetEmployeeId) {
    throw new HttpsError("invalid-argument", "請提供目標用戶的員工編號");
  }

  try {
    logger.info(`開始為員工編號 ${targetEmployeeId} 指派管理員權限`);
    
    // 查找目標用戶
    const targetUserSnapshot = await db.collection("users")
      .where("employeeId", "==", targetEmployeeId)
      .get();
    
    if (targetUserSnapshot.empty) {
      throw new HttpsError("not-found", `找不到員工編號為 ${targetEmployeeId} 的用戶`);
    }
    
    const targetUserDoc = targetUserSnapshot.docs[0];
    const targetUserData = targetUserDoc.data();
    
    // 更新用戶權限
    await targetUserDoc.ref.update({
      roleName: "系統管理員",
      permissions: ALL_PERMISSIONS,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: contextAuth.uid,
      grantedBy: `${contextAuth.uid} (${new Date().toISOString()})`
    });
    
    logger.info(`已為用戶 ${targetUserData.name} (${targetEmployeeId}) 指派管理員權限`);
    
    return {
      status: "success",
      message: `已成功為 ${targetUserData.name} (${targetEmployeeId}) 指派完整管理員權限。`,
      details: {
        targetUser: {
          name: targetUserData.name,
          employeeId: targetEmployeeId,
          uid: targetUserDoc.id,
          permissionCount: ALL_PERMISSIONS.length,
          permissions: ALL_PERMISSIONS
        }
      }
    };
  } catch (error) {
    logger.error(`為員工編號 ${targetEmployeeId} 指派權限失敗:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "指派權限時發生未知錯誤。");
  }
});