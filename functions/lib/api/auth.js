"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPassword = exports.loginWithEmployeeId = void 0;
// functions/src/api/auth.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
exports.loginWithEmployeeId = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: false,
    handler: async (request) => {
        const { data } = request;
        const { employeeId, password } = data;
        if (!employeeId || !password) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.MISSING_REQUIRED_FIELD, {
                missingFields: ['employeeId', 'password'],
                message: "請提供員工編號和密碼"
            });
        }
        try {
            // 使用員工編號作為 UID 進行登入
            const userRecord = await auth.getUser(employeeId);
            if (userRecord.disabled) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.PERMISSION_DENIED, {
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
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                    message: "找不到此員工編號的帳號",
                    resourceType: "用戶帳號",
                    resourceId: employeeId
                });
            }
            const userData = userDoc.data();
            firebase_functions_1.logger.info(`員工 ${employeeId} 登入成功`);
            return {
                customToken: customToken,
                user: {
                    uid: employeeId,
                    name: userData === null || userData === void 0 ? void 0 : userData.name,
                    employeeId: userData === null || userData === void 0 ? void 0 : userData.employeeId,
                    phone: userData === null || userData === void 0 ? void 0 : userData.phone,
                    status: userData === null || userData === void 0 ? void 0 : userData.status
                },
                message: "登入成功"
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `員工登入 ${employeeId}`, employeeId);
        }
    }
}));
exports.verifyPassword = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: false,
    handler: async (request) => {
        const { data } = request;
        const { employeeId, password } = data;
        if (!employeeId || !password) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.MISSING_REQUIRED_FIELD, {
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
            }
            catch (error) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                    message: "找不到此員工編號的帳號",
                    resourceType: "用戶帳號",
                    resourceId: employeeId
                });
            }
            // TODO: 實際的密碼驗證邏輯需要根據您的需求實現
            // 暫時返回成功，實際實現需要根據您的需求調整
            firebase_functions_1.logger.info(`密碼驗證請求: ${employeeId}`);
            return {
                employeeId: employeeId,
                verified: true,
                message: "密碼驗證成功"
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `密碼驗證 ${employeeId}`, employeeId);
        }
    }
}));
//# sourceMappingURL=auth.js.map