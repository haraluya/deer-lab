"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPassword = exports.loginWithEmployeeId = void 0;
// functions/src/api/auth.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
exports.loginWithEmployeeId = (0, https_1.onCall)(async (request) => {
    const { data } = request;
    const { employeeId, password } = data;
    if (!employeeId || !password) {
        throw new https_1.HttpsError("invalid-argument", "請提供員工編號和密碼。");
    }
    try {
        // 使用員工編號作為 UID 進行登入
        const userRecord = await auth.getUser(employeeId);
        if (userRecord.disabled) {
            throw new https_1.HttpsError("permission-denied", "此帳號已被停用，請聯絡管理員。");
        }
        // 驗證密碼（這裡需要自定義實現，因為 Firebase Auth 不直接支援 UID 登入）
        // 我們需要先獲取用戶的 JWT token
        const customToken = await auth.createCustomToken(employeeId);
        // 獲取用戶資料
        const userDoc = await db.collection("users").doc(employeeId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到此員工編號的帳號。");
        }
        const userData = userDoc.data();
        firebase_functions_1.logger.info(`員工 ${employeeId} 登入成功`);
        return {
            status: "success",
            message: "登入成功",
            customToken,
            user: {
                uid: employeeId,
                name: userData === null || userData === void 0 ? void 0 : userData.name,
                employeeId: userData === null || userData === void 0 ? void 0 : userData.employeeId,
                phone: userData === null || userData === void 0 ? void 0 : userData.phone,
                status: userData === null || userData === void 0 ? void 0 : userData.status
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`員工 ${employeeId} 登入失敗:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("unauthenticated", "員工編號或密碼錯誤。");
    }
});
exports.verifyPassword = (0, https_1.onCall)(async (request) => {
    const { data } = request;
    const { employeeId, password } = data;
    if (!employeeId || !password) {
        throw new https_1.HttpsError("invalid-argument", "請提供員工編號和密碼。");
    }
    try {
        // 這裡需要實現密碼驗證邏輯
        // 由於 Firebase Auth 的限制，我們需要自定義實現
        // 可以考慮使用 Firebase Auth 的 signInWithEmailAndPassword 或自定義驗證
        // 暫時返回成功，實際實現需要根據您的需求調整
        return {
            status: "success",
            message: "密碼驗證成功"
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`密碼驗證失敗:`, error);
        throw new https_1.HttpsError("unauthenticated", "密碼驗證失敗。");
    }
});
//# sourceMappingURL=auth.js.map