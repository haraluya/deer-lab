"use strict";
// functions/src/api/users.ts
// 暫時停用以修復部署錯誤 - 前端使用統一API客戶端
// 參考：D:\APP\deer-lab\統一API客戶端使用指南.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserStatus = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
// 簡化版本，只提供基本功能
exports.setUserStatus = (0, https_1.onCall)(async (request) => {
    try {
        const { data } = request;
        const { uid, status } = data;
        if (!uid || !status) {
            throw new https_1.HttpsError("invalid-argument", "缺少必要參數");
        }
        await db.collection("users").doc(uid).update({
            status,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        return { uid, status, message: "用戶狀態更新成功" };
    }
    catch (error) {
        firebase_functions_1.logger.error("更新用戶狀態失敗:", error);
        throw new https_1.HttpsError("internal", "更新用戶狀態失敗");
    }
});
// 其他函數暫時停用，等待 apiWrapper 系統修復
/*
export const createUser = ...
export const updateUser = ...
*/ 
//# sourceMappingURL=users.js.map