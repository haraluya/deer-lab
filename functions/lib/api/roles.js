"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignUserRole = exports.getRole = exports.getRoles = exports.initializeDefaultRoles = exports.deleteRole = exports.checkRoleUsage = exports.updateRole = exports.createRole = void 0;
// functions/src/api/roles.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../utils/auth");
const permissions_1 = require("../utils/permissions");
// CORS 設定選項
const corsOptions = {
    cors: true
};
const db = (0, firestore_1.getFirestore)();
exports.createRole = (0, https_1.onCall)(corsOptions, async (request) => {
    const { data, auth: contextAuth } = request;
    await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    const { name, description, permissions } = data;
    if (!name || !permissions || !Array.isArray(permissions)) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (角色名稱、權限列表)。");
    }
    try {
        // 檢查角色名稱是否已存在
        const existingRoles = await db.collection("roles")
            .where("name", "==", name)
            .get();
        if (!existingRoles.empty) {
            throw new https_1.HttpsError("already-exists", "角色名稱已存在，請使用不同的名稱。");
        }
        const roleData = {
            name,
            description: description || "",
            permissions,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid
        };
        const docRef = await db.collection("roles").add(roleData);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功建立新角色: ${name} (${docRef.id})`);
        return {
            status: "success",
            message: `角色 ${name} 已成功建立。`,
            roleId: docRef.id
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("建立角色時發生錯誤:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "建立角色時發生未知錯誤。");
    }
});
exports.updateRole = (0, https_1.onCall)(corsOptions, async (request) => {
    const { data, auth: contextAuth } = request;
    await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    const { roleId, name, description, permissions } = data;
    if (!roleId || !name || !permissions || !Array.isArray(permissions)) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (角色ID、角色名稱、權限列表)。");
    }
    try {
        const roleRef = db.collection("roles").doc(roleId);
        const roleDoc = await roleRef.get();
        if (!roleDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的角色。");
        }
        // 檢查角色名稱是否已被其他角色使用
        const existingRoles = await db.collection("roles")
            .where("name", "==", name)
            .get();
        const nameExists = existingRoles.docs.some(doc => doc.id !== roleId);
        if (nameExists) {
            throw new https_1.HttpsError("already-exists", "角色名稱已存在，請使用不同的名稱。");
        }
        const updateData = {
            name,
            description: description || "",
            permissions,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid
        };
        await roleRef.update(updateData);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更新角色: ${name} (${roleId})`);
        return {
            status: "success",
            message: `角色 ${name} 已成功更新。`
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新角色 ${roleId} 時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "更新角色時發生未知錯誤。");
    }
});
exports.checkRoleUsage = (0, https_1.onCall)(corsOptions, async (request) => {
    const { data, auth: contextAuth } = request;
    await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    const { roleId } = data;
    if (!roleId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少角色ID。");
    }
    try {
        const roleRef = db.collection("roles").doc(roleId);
        const roleDoc = await roleRef.get();
        if (!roleDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的角色。");
        }
        // 檢查有多少使用者正在使用此角色
        const usersWithRole = await db.collection("users")
            .where("roleRef", "==", roleRef)
            .get();
        const userCount = usersWithRole.size;
        firebase_functions_1.logger.info(`檢查角色 ${roleId} 使用情況: ${userCount} 個使用者`);
        return {
            status: "success",
            userCount,
            canDelete: userCount === 0
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`檢查角色 ${roleId} 使用情況時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "檢查角色使用情況時發生未知錯誤。");
    }
});
exports.deleteRole = (0, https_1.onCall)(corsOptions, async (request) => {
    const { data, auth: contextAuth } = request;
    await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    const { roleId } = data;
    if (!roleId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少角色ID。");
    }
    try {
        const roleRef = db.collection("roles").doc(roleId);
        const roleDoc = await roleRef.get();
        if (!roleDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的角色。");
        }
        // 檢查是否有使用者正在使用此角色
        const usersWithRole = await db.collection("users")
            .where("roleRef", "==", roleRef)
            .get();
        if (!usersWithRole.empty) {
            throw new https_1.HttpsError("failed-precondition", `無法刪除角色，因為還有 ${usersWithRole.size} 個使用者正在使用此角色。`);
        }
        await roleRef.delete();
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功刪除角色: ${roleId}`);
        return {
            status: "success",
            message: "角色已成功刪除。"
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除角色 ${roleId} 時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "刪除角色時發生未知錯誤。");
    }
});
/**
 * 初始化預設角色
 * 僅在角色集合為空時執行
 */
exports.initializeDefaultRoles = (0, https_1.onCall)(corsOptions, async (request) => {
    const { auth: contextAuth } = request;
    try {
        // 檢查是否已有角色存在
        const existingRoles = await db.collection("roles").get();
        // 如果已有角色，則需要權限檢查
        if (!existingRoles.empty) {
            await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
        // 如果沒有角色，允許任何已登入的用戶初始化（首次設定）
        if (!existingRoles.empty) {
            firebase_functions_1.logger.info("角色已存在，跳過初始化");
            return {
                status: "skipped",
                message: "系統已有角色存在，跳過初始化",
                existingCount: existingRoles.size
            };
        }
        // 初始化預設角色
        const batch = db.batch();
        const createdRoles = [];
        for (const role of permissions_1.DEFAULT_ROLES) {
            const roleRef = db.collection("roles").doc(role.id);
            const roleData = Object.assign(Object.assign({}, role), { createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
            batch.set(roleRef, roleData);
            createdRoles.push(role.displayName);
        }
        await batch.commit();
        firebase_functions_1.logger.info(`成功初始化預設角色: ${createdRoles.join(', ')}`);
        return {
            status: "success",
            message: `成功初始化 ${createdRoles.length} 個預設角色`,
            roles: createdRoles
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("初始化預設角色時發生錯誤:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "初始化預設角色時發生未知錯誤。");
    }
});
/**
 * 取得所有角色列表
 */
exports.getRoles = (0, https_1.onCall)(corsOptions, async (request) => {
    const { auth: contextAuth } = request;
    try {
        const rolesSnapshot = await db.collection("roles")
            .orderBy("createdAt", "asc")
            .get();
        // 如果沒有角色存在，允許任何已登入用戶查看（用於初始設定）
        if (rolesSnapshot.empty) {
            if (!(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid)) {
                throw new https_1.HttpsError("unauthenticated", "需要登入才能查看角色列表");
            }
        }
        else {
            // 如果已有角色，需要權限檢查
            await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
        const roles = rolesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        firebase_functions_1.logger.info(`查詢角色列表成功，共 ${roles.length} 個角色`);
        return {
            status: "success",
            roles: roles
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("查詢角色列表時發生錯誤:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "查詢角色列表時發生未知錯誤。");
    }
});
/**
 * 取得角色詳細資訊
 */
exports.getRole = (0, https_1.onCall)(corsOptions, async (request) => {
    const { data, auth: contextAuth } = request;
    await (0, auth_1.ensureCanManageRoles)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    const { roleId } = data;
    if (!roleId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少角色ID。");
    }
    try {
        const roleDoc = await db.collection("roles").doc(roleId).get();
        if (!roleDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的角色。");
        }
        const roleData = Object.assign({ id: roleDoc.id }, roleDoc.data());
        firebase_functions_1.logger.info(`查詢角色詳情成功: ${roleId}`);
        return {
            status: "success",
            role: roleData
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`查詢角色詳情時發生錯誤: ${roleId}`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "查詢角色詳情時發生未知錯誤。");
    }
});
/**
 * 指派角色給使用者
 */
exports.assignUserRole = (0, https_1.onCall)(corsOptions, async (request) => {
    var _a, _b;
    const { data, auth: contextAuth } = request;
    await (0, auth_1.ensureCanManagePersonnel)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    const { userId, roleId } = data;
    if (!userId || !roleId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少使用者ID或角色ID。");
    }
    try {
        // 檢查角色是否存在
        const roleRef = db.collection("roles").doc(roleId);
        const roleDoc = await roleRef.get();
        if (!roleDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的角色。");
        }
        // 檢查使用者是否存在
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的使用者。");
        }
        // 更新使用者角色
        await userRef.update({
            roleRef: roleRef,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid
        });
        const roleName = ((_a = roleDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || roleId;
        const userName = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.name) || userId;
        firebase_functions_1.logger.info(`成功指派角色: ${userName} -> ${roleName}`);
        return {
            status: "success",
            message: `成功將角色 ${roleName} 指派給 ${userName}`
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`指派角色時發生錯誤: ${userId} -> ${roleId}`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "指派角色時發生未知錯誤。");
    }
});
//# sourceMappingURL=roles.js.map