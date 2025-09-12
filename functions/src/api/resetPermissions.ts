// functions/src/api/resetPermissions.ts
import { logger } from "firebase-functions";
import { onCall, CallableOptions } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { apiWrapper } from "../utils/apiWrapper";
import { BusinessError, ERROR_CODES, ErrorHandler } from "../utils/errorHandler";
import { requireAuth } from "../middleware/auth";
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
export const resetPermissionsSystem = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    const { targetEmployeeId } = data;
    
    if (!targetEmployeeId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['targetEmployeeId'],
        message: "請提供目標用戶的員工編號"
      });
    }

    try {
      logger.info(`開始權限系統重置，操作者: ${contextAuth?.uid}，目標員工編號: ${targetEmployeeId}`);
      
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
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: `找不到員工編號為 ${targetEmployeeId} 的用戶`,
          resourceType: "用戶",
          resourceId: targetEmployeeId
        });
      }
      
      const targetUserDoc = targetUserSnapshot.docs[0];
      const targetUserData = targetUserDoc.data();
      
      await targetUserDoc.ref.update({
        roleName: "系統管理員",
        permissions: ALL_PERMISSIONS,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: contextAuth?.uid,
        resetBy: `${contextAuth?.uid} (${new Date().toISOString()})`
      });
      
      logger.info(`已為用戶 ${targetUserData.name} (${targetEmployeeId}) 設定完整權限`);
      
      return {
        targetUser: {
          name: targetUserData.name,
          employeeId: targetEmployeeId,
          uid: targetUserDoc.id,
          permissionCount: ALL_PERMISSIONS.length
        },
        operationSummary: {
          rolesCleared: rolesSnapshot.size,
          usersUpdated: usersSnapshot.size
        },
        message: `權限系統重置完成。用戶 ${targetUserData.name} (${targetEmployeeId}) 已獲得完整管理員權限`,
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `權限系統重置 ${targetEmployeeId}`, contextAuth?.uid);
    }
  }
}));

/**
 * 快速指派管理員權限給指定員工編號
 */
export const grantAdminPermissions = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    const { targetEmployeeId } = data;
    
    if (!targetEmployeeId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['targetEmployeeId'],
        message: "請提供目標用戶的員工編號"
      });
    }

    try {
      logger.info(`開始為員工編號 ${targetEmployeeId} 指派管理員權限，操作者: ${contextAuth?.uid}`);
      
      // 查找目標用戶
      const targetUserSnapshot = await db.collection("users")
        .where("employeeId", "==", targetEmployeeId)
        .get();
      
      if (targetUserSnapshot.empty) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: `找不到員工編號為 ${targetEmployeeId} 的用戶`,
          resourceType: "用戶",
          resourceId: targetEmployeeId
        });
      }
      
      const targetUserDoc = targetUserSnapshot.docs[0];
      const targetUserData = targetUserDoc.data();
      
      // 更新用戶權限
      await targetUserDoc.ref.update({
        roleName: "系統管理員",
        permissions: ALL_PERMISSIONS,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: contextAuth?.uid,
        grantedBy: `${contextAuth?.uid} (${new Date().toISOString()})`
      });
      
      logger.info(`已為用戶 ${targetUserData.name} (${targetEmployeeId}) 指派管理員權限`);
      
      return {
        targetUser: {
          name: targetUserData.name,
          employeeId: targetEmployeeId,
          uid: targetUserDoc.id,
          permissionCount: ALL_PERMISSIONS.length,
          permissions: ALL_PERMISSIONS
        },
        grantedBy: contextAuth?.uid,
        message: `已成功為 ${targetUserData.name} (${targetEmployeeId}) 指派完整管理員權限`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `指派管理員權限 ${targetEmployeeId}`, contextAuth?.uid);
    }
  }
}));