// functions/src/api/users.ts
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { apiWrapper } from "../utils/apiWrapper";
import { BusinessError, ERROR_CODES, ErrorHandler } from "../utils/errorHandler";
import { requireAuth } from "../middleware/auth";

const db = getFirestore();
const auth = getAuth();

export const createUser = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    const { employeeId, password, name, roleId, phone, status } = data;
    
    if (!employeeId || !password || !name || !roleId || !phone || !status) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['employeeId', 'password', 'name', 'roleId', 'phone', 'status']
      });
    }

    try {
      const email = `${employeeId}@deer-lab.local`;
      
      // 建立 Firebase Auth 用戶
      const userRecord = await auth.createUser({
        uid: employeeId,
        email: email,
        password: password,
        displayName: name
      });

      const roleRef = db.collection("roles").doc(roleId);

      // 建立 Firestore 用戶文檔
      await db.collection("users").doc(userRecord.uid).set({
        name: name,
        employeeId: employeeId,
        phone: phone,
        roleRef: roleRef,
        status: status,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info(`管理員 ${contextAuth?.uid} 成功建立新使用者: ${userRecord.uid}`);

      return {
        uid: userRecord.uid,
        message: `使用者 ${name} (${employeeId}) 已成功建立`,
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `建立使用者 ${employeeId}`, contextAuth?.uid);
    }
  }
}));

export const updateUser = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    const { uid, name, roleId, phone } = data;
    
    // 檢查是否為用戶更新自己的資料
    const isSelfUpdate = contextAuth?.uid === uid;
    
    if (!uid || !name || !phone) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['uid', 'name', 'phone']
      });
    }
    
    // 如果是自我更新，不需要 roleId；如果是管理員更新，需要 roleId
    if (!isSelfUpdate && !roleId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        message: "管理員更新用戶資料時需要提供 roleId"
      });
    }

    try {
      const userDocRef = db.collection("users").doc(uid);
      const updateData: any = {
        name: name,
        phone: phone,
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // 只有管理員可以更新角色
      if (!isSelfUpdate && roleId) {
        const roleRef = db.collection("roles").doc(roleId);
        updateData.roleRef = roleRef;
      }
      
      // 更新 Firestore 用戶文檔
      await userDocRef.update(updateData);
      
      // 同步更新 Firebase Auth 顯示名稱
      const userRecord = await auth.getUser(uid);
      if (userRecord.displayName !== name) {
        await auth.updateUser(uid, { displayName: name });
      }
      
      const action = isSelfUpdate ? "用戶" : "管理員";
      logger.info(`${action} ${contextAuth?.uid} 成功更新使用者資料: ${uid}`);

      return {
        uid: uid,
        message: `使用者 ${name} 的資料已成功更新`,
        isSelfUpdate: isSelfUpdate
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `更新使用者 ${uid}`, contextAuth?.uid);
    }
  }
}));

export const setUserStatus = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    const { uid, status } = data;
    
    if (!uid || (status !== "active" && status !== "inactive")) {
      throw new BusinessError(ERROR_CODES.INVALID_INPUT, {
        message: "請求缺少 UID 或狀態無效 (必須是 'active' 或 'inactive')"
      });
    }
    
    if (uid === contextAuth?.uid) {
      throw new BusinessError(ERROR_CODES.PERMISSION_DENIED, {
        message: "無法變更自己的帳號狀態"
      });
    }

    try {
      // 更新 Firebase Auth 用戶狀態
      await auth.updateUser(uid, { disabled: status === "inactive" });
      
      // 更新 Firestore 用戶文檔狀態
      await db.collection("users").doc(uid).update({
        status: status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`管理員 ${contextAuth?.uid} 成功將使用者 ${uid} 狀態變更為 ${status}`);

      return {
        uid: uid,
        status: status,
        message: `使用者狀態已成功更新為 ${status === "active" ? "在職" : "停用"}`,
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `變更使用者 ${uid} 狀態`, contextAuth?.uid);
    }
  }
}));
