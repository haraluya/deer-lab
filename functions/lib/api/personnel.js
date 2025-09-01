"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePersonnel = exports.updatePersonnel = exports.createPersonnel = void 0;
// functions/src/api/personnel.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
exports.createPersonnel = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureCanManagePersonnel(contextAuth?.uid);
    const { name, employeeId, phone, roleId, password, status } = data;
    if (!name || !employeeId || !phone || !roleId || !password || !status) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (姓名、員工編號、電話、角色、密碼、狀態)。");
    }
    try {
        // 檢查員工編號是否已存在
        const existingUsers = await db.collection("users")
            .where("employeeId", "==", employeeId)
            .get();
        if (!existingUsers.empty) {
            throw new https_1.HttpsError("already-exists", "員工編號已存在，請使用不同的編號。");
        }
        // 創建 Firebase Auth 用戶
        const email = `${employeeId}@deer-lab.local`;
        const authData = {
            uid: employeeId,
            email: email,
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid
        };
        await db.collection("users").doc(userRecord.uid).set(personnelData);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功建立新人員: ${name} (${employeeId})`);
        return {
            status: "success",
            message: `人員 ${name} 已成功建立。`,
            uid: userRecord.uid
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("建立人員時發生錯誤:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "建立人員時發生未知錯誤。");
    }
});
exports.updatePersonnel = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureCanManagePersonnel(contextAuth?.uid);
    const { personnelId, name, employeeId, phone, roleId, password, status } = data;
    if (!personnelId || !name || !employeeId || !phone || !roleId || !status) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (人員ID、姓名、員工編號、電話、角色、狀態)。");
    }
    try {
        const userRef = db.collection("users").doc(personnelId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的人員。");
        }
        // 檢查員工編號是否已被其他用戶使用
        const existingUsers = await db.collection("users")
            .where("employeeId", "==", employeeId)
            .get();
        const employeeIdExists = existingUsers.docs.some(doc => doc.id !== personnelId);
        if (employeeIdExists) {
            throw new https_1.HttpsError("already-exists", "員工編號已存在，請使用不同的編號。");
        }
        // 更新 Firebase Auth 用戶
        const email = `${employeeId}@deer-lab.local`;
        const updateAuthData = {
            displayName: name,
            disabled: status === "inactive",
            email: email
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
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid
        };
        await userRef.update(updateData);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更新人員: ${name} (${personnelId})`);
        return {
            status: "success",
            message: `人員 ${name} 已成功更新。`
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新人員 ${personnelId} 時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "更新人員時發生未知錯誤。");
    }
});
exports.deletePersonnel = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureCanManagePersonnel(contextAuth?.uid);
    const { personnelId } = data;
    if (!personnelId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少人員ID。");
    }
    if (personnelId === (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid)) {
        throw new https_1.HttpsError("failed-precondition", "無法刪除自己的帳號。");
    }
    try {
        const userRef = db.collection("users").doc(personnelId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的人員。");
        }
        // 刪除 Firebase Auth 用戶
        await auth.deleteUser(personnelId);
        // 刪除 Firestore 資料
        await userRef.delete();
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功刪除人員: ${personnelId}`);
        return {
            status: "success",
            message: "人員已成功刪除。"
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除人員 ${personnelId} 時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "刪除人員時發生未知錯誤。");
    }
});
//# sourceMappingURL=personnel.js.map