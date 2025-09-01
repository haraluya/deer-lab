"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserStatus = exports.updateUser = exports.createUser = void 0;
// functions/src/api/users.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
exports.createUser = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { employeeId, password, name, roleId, phone, status } = data;
    if (!employeeId || !password || !name || !roleId || !phone || !status) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (工號、密碼、姓名、角色、電話、狀態)。");
    }
    try {
        const email = `${employeeId}@deer-lab.local`;
        const userRecord = await auth.createUser({
            uid: employeeId,
            email: email,
            password: password,
            displayName: name
        });
        const roleRef = db.collection("roles").doc(roleId);
        await db.collection("users").doc(userRecord.uid).set({
            name: name,
            employeeId: employeeId,
            phone: phone,
            roleRef: roleRef,
            status: status,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功建立新使用者: ${userRecord.uid}`);
        return { status: "success", message: `使用者 ${name} (${employeeId}) 已成功建立。`, uid: userRecord.uid };
    }
    catch (error) {
        firebase_functions_1.logger.error("建立使用者時發生錯誤:", error);
        throw new https_1.HttpsError("internal", "建立使用者時發生未知錯誤。");
    }
});
exports.updateUser = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    const { uid, name, roleId, phone } = data;
    // 檢查是否為用戶更新自己的資料
    const isSelfUpdate = (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) === uid;
    if (!uid || !name || !phone) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (uid, name, phone)。");
    }
    // 如果是自我更新，不需要 roleId；如果是管理員更新，需要 roleId
    if (!isSelfUpdate && !roleId) {
        throw new https_1.HttpsError("invalid-argument", "管理員更新用戶資料時需要提供 roleId。");
    }
    try {
        const userDocRef = db.collection("users").doc(uid);
        const updateData = {
            name: name,
            phone: phone,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 只有管理員可以更新角色
        if (!isSelfUpdate && roleId) {
            const roleRef = db.collection("roles").doc(roleId);
            updateData.roleRef = roleRef;
        }
        await userDocRef.update(updateData);
        const userRecord = await auth.getUser(uid);
        if (userRecord.displayName !== name) {
            await auth.updateUser(uid, { displayName: name });
        }
        const action = isSelfUpdate ? "用戶" : "管理員";
        firebase_functions_1.logger.info(`${action} ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更新使用者資料: ${uid}`);
        return { status: "success", message: `使用者 ${name} 的資料已成功更新。` };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新使用者 ${uid} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "更新使用者資料時發生未知錯誤。");
    }
});
exports.setUserStatus = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { uid, status } = data;
    if (!uid || (status !== "active" && status !== "inactive")) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少 UID 或狀態無效 (必須是 'active' 或 'inactive')。");
    }
    if (uid === (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid)) {
        throw new https_1.HttpsError("failed-precondition", "無法變更自己的帳號狀態。");
    }
    try {
        await auth.updateUser(uid, { disabled: status === "inactive" });
        await db.collection("users").doc(uid).update({ status: status, updatedAt: firestore_1.FieldValue.serverTimestamp(), });
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功將使用者 ${uid} 狀態變更為 ${status}`);
        return { status: "success", message: `使用者狀態已成功更新為 ${status === "active" ? "在職" : "停用"}。` };
    }
    catch (error) {
        firebase_functions_1.logger.error(`變更使用者 ${uid} 狀態時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "變更使用者狀態時發生未知錯誤。");
    }
});
//# sourceMappingURL=users.js.map