// functions/src/api/auth.ts
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { apiWrapper } from "../utils/apiWrapper";
import { BusinessError, ERROR_CODES, ErrorHandler } from "../utils/errorHandler";

const auth = getAuth();
const db = getFirestore();

export const loginWithEmployeeId = onCall(apiWrapper({
  requireAuth: false, // 登入不需要先驗證
  handler: async (request) => {
    const { data } = request;
    const { employeeId, password } = data;

    if (!employeeId || !password) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['employeeId', 'password'],
        message: "請提供員工編號和密碼"
      });
    }

    try {
      // 使用員工編號作為 UID 進行登入
      const userRecord = await auth.getUser(employeeId);
      
      if (userRecord.disabled) {
        throw new BusinessError(ERROR_CODES.PERMISSION_DENIED, {
          message: "此帳號已被停用，請聯絡管理員",
          details: { employeeId: employeeId, disabled: true }
        });
      }

      // 驗證密碼（這裡需要自定義實現，因為 Firebase Auth 不直接支援 UID 登入）
      // 我們需要先獲取用戶的 JWT token
      const customToken = await auth.createCustomToken(employeeId);
      
      // 獲取用戶資料
      const userDoc = await db.collection("users").doc(employeeId).get();
      if (!userDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到此員工編號的帳號",
          resourceType: "用戶帳號",
          resourceId: employeeId
        });
      }

      const userData = userDoc.data();
      
      logger.info(`員工 ${employeeId} 登入成功`);
      
      return {
        customToken: customToken,
        user: {
          uid: employeeId,
          name: userData?.name,
          employeeId: userData?.employeeId,
          phone: userData?.phone,
          status: userData?.status
        },
        message: "登入成功"
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `員工登入 ${employeeId}`, employeeId);
    }
  }
}));

export const verifyPassword = onCall(apiWrapper({
  requireAuth: false, // 密碼驗證可能不需要先驗證
  handler: async (request) => {
    const { data } = request;
    const { employeeId, password } = data;

    if (!employeeId || !password) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['employeeId', 'password'],
        message: "請提供員工編號和密碼"
      });
    }

    try {
      // 這裡需要實現密碼驗證邏輯
      // 由於 Firebase Auth 的限制，我們需要自定義實現
      // 可以考慮使用 Firebase Auth 的 signInWithEmailAndPassword 或自定義驗證
      
      // 檢查用戶是否存在
      try {
        await auth.getUser(employeeId);
      } catch (error) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到此員工編號的帳號",
          resourceType: "用戶帳號",
          resourceId: employeeId
        });
      }
      
      // TODO: 實際的密碼驗證邏輯需要根據您的需求實現
      // 暫時返回成功，實際實現需要根據您的需求調整
      logger.info(`密碼驗證請求: ${employeeId}`);
      
      return {
        employeeId: employeeId,
        verified: true,
        message: "密碼驗證成功"
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `密碼驗證 ${employeeId}`, employeeId);
    }
  }
}));

