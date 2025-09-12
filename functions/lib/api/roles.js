"use strict";
// functions/src/api/roles.ts
// 暫時停用以修復部署錯誤 - 前端使用統一API客戶端
// 參考：D:\APP\deer-lab\統一API客戶端使用指南.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDefaultRoles = exports.getRoles = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// 簡化版本，只提供基本功能
exports.getRoles = (0, https_1.onCall)(async (request) => {
    try {
        const rolesSnapshot = await db.collection("roles").get();
        const roles = rolesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { roles };
    }
    catch (error) {
        firebase_functions_1.logger.error("獲取角色失敗:", error);
        throw new https_1.HttpsError("internal", "獲取角色失敗");
    }
});
exports.initializeDefaultRoles = (0, https_1.onCall)(async (request) => {
    try {
        // 檢查是否已有角色
        const existingRoles = await db.collection("roles").get();
        if (!existingRoles.empty) {
            return { message: "角色已存在，無需初始化" };
        }
        // 創建預設角色
        const defaultRoles = [
            { name: "系統管理員", permissions: ["all"] },
            { name: "生產領班", permissions: ["production"] },
            { name: "計時人員", permissions: ["time"] }
        ];
        const batch = db.batch();
        for (const role of defaultRoles) {
            const roleRef = db.collection("roles").doc();
            batch.set(roleRef, Object.assign(Object.assign({}, role), { createdAt: firestore_1.FieldValue.serverTimestamp() }));
        }
        await batch.commit();
        return { message: "預設角色建立成功" };
    }
    catch (error) {
        firebase_functions_1.logger.error("初始化角色失敗:", error);
        throw new https_1.HttpsError("internal", "初始化角色失敗");
    }
});
// 其他函數暫時停用，等待 apiWrapper 系統修復
/*
export const createRole = ...
export const updateRole = ...
export const deleteRole = ...
export const assignUserRole = ...
*/ 
//# sourceMappingURL=roles.js.map