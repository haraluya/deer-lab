// functions/src/api/roles.ts
import { logger } from "firebase-functions";
import { onCall, CallableOptions } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { apiWrapper } from "../utils/apiWrapper";
import { BusinessError, ERROR_CODES, ErrorHandler } from "../utils/errorHandler";
import { requireAuth, requirePermission } from "../middleware/auth";
import { ensureCanManageRoles, ensureCanManagePersonnel } from "../utils/auth";
import { DEFAULT_ROLES, Role } from "../utils/permissions";

// CORS 設定選項
const corsOptions: CallableOptions = {
  cors: true
};

const db = getFirestore();

export const createRole = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    await ensureCanManageRoles(contextAuth?.uid);
    
    const { name, description, permissions } = data;
    
    if (!name || !permissions || !Array.isArray(permissions)) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['name', 'permissions'],
        message: "角色名稱和權限列表為必要欄位"
      });
    }

    try {
      // 檢查角色名稱是否已存在
      const existingRoles = await db.collection("roles")
        .where("name", "==", name)
        .get();
      
      if (!existingRoles.empty) {
        throw new BusinessError(ERROR_CODES.RESOURCE_ALREADY_EXISTS, {
          message: "角色名稱已存在，請使用不同的名稱",
          resourceType: "角色",
          resourceName: name
        });
      }

      const roleData = {
        name,
        description: description || "",
        permissions,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: contextAuth?.uid
      };

      const docRef = await db.collection("roles").add(roleData);
      
      logger.info(`管理員 ${contextAuth?.uid} 成功建立新角色: ${name} (${docRef.id})`);
      
      return {
        roleId: docRef.id,
        name: name,
        message: `角色 ${name} 已成功建立`,
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `建立角色 ${name}`, contextAuth?.uid);
    }
  }
}));

export const updateRole = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    await ensureCanManageRoles(contextAuth?.uid);
    
    const { roleId, name, description, permissions } = data;
    
    if (!roleId || !name || !permissions || !Array.isArray(permissions)) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['roleId', 'name', 'permissions'],
        message: "角色ID、角色名稱和權限列表為必要欄位"
      });
    }

    try {
      const roleRef = db.collection("roles").doc(roleId);
      const roleDoc = await roleRef.get();
      
      if (!roleDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的角色",
          resourceType: "角色",
          resourceId: roleId
        });
      }

      // 檢查角色名稱是否已被其他角色使用
      const existingRoles = await db.collection("roles")
        .where("name", "==", name)
        .get();
      
      const nameExists = existingRoles.docs.some(doc => doc.id !== roleId);
      if (nameExists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_ALREADY_EXISTS, {
          message: "角色名稱已存在，請使用不同的名稱",
          resourceType: "角色",
          resourceName: name
        });
      }

      const updateData = {
        name,
        description: description || "",
        permissions,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: contextAuth?.uid
      };

      await roleRef.update(updateData);
      
      logger.info(`管理員 ${contextAuth?.uid} 成功更新角色: ${name} (${roleId})`);
      
      return {
        roleId: roleId,
        name: name,
        message: `角色 ${name} 已成功更新`,
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `更新角色 ${roleId}`, contextAuth?.uid);
    }
  }
}));

export const checkRoleUsage = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    await ensureCanManageRoles(contextAuth?.uid);
    
    const { roleId } = data;
    
    if (!roleId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['roleId']
      });
    }

    try {
      const roleRef = db.collection("roles").doc(roleId);
      const roleDoc = await roleRef.get();
      
      if (!roleDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的角色",
          resourceType: "角色",
          resourceId: roleId
        });
      }

      // 檢查有多少使用者正在使用此角色
      const usersWithRole = await db.collection("users")
        .where("roleRef", "==", roleRef)
        .get();
      
      const userCount = usersWithRole.size;
      
      logger.info(`檢查角色 ${roleId} 使用情況: ${userCount} 個使用者`);
      
      return {
        roleId: roleId,
        userCount: userCount,
        canDelete: userCount === 0,
        message: `角色使用情況檢查完成，共 ${userCount} 個使用者`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `檢查角色使用情況 ${roleId}`, contextAuth?.uid);
    }
  }
}));

export const deleteRole = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    await ensureCanManageRoles(contextAuth?.uid);
    
    const { roleId } = data;
    
    if (!roleId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['roleId']
      });
    }

    try {
      const roleRef = db.collection("roles").doc(roleId);
      const roleDoc = await roleRef.get();
      
      if (!roleDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的角色",
          resourceType: "角色",
          resourceId: roleId
        });
      }

      // 檢查是否有使用者正在使用此角色
      const usersWithRole = await db.collection("users")
        .where("roleRef", "==", roleRef)
        .get();
      
      if (!usersWithRole.empty) {
        throw new BusinessError(ERROR_CODES.BUSINESS_RULE_VIOLATION, {
          message: `無法刪除角色，因為還有 ${usersWithRole.size} 個使用者正在使用此角色`,
          details: { userCount: usersWithRole.size, roleId: roleId }
        });
      }

      const roleName = roleDoc.data()?.name || roleId;
      await roleRef.delete();
      
      logger.info(`管理員 ${contextAuth?.uid} 成功刪除角色: ${roleId}`);
      
      return {
        roleId: roleId,
        name: roleName,
        message: "角色已成功刪除"
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `刪除角色 ${roleId}`, contextAuth?.uid);
    }
  }
}));

/**
 * 初始化預設角色
 * 僅在角色集合為空時執行
 */
export const initializeDefaultRoles = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { auth: contextAuth } = request;
    
    try {
      // 檢查是否已有角色存在
      const existingRoles = await db.collection("roles").get();
      
      // 如果已有角色，則需要權限檢查
      if (!existingRoles.empty) {
        await ensureCanManageRoles(contextAuth?.uid);
        logger.info("角色已存在，跳過初始化");
        return {
          status: "skipped",
          existingCount: existingRoles.size,
          message: "系統已有角色存在，跳過初始化"
        };
      }
      // 如果沒有角色，允許任何已登入的用戶初始化（首次設定）

      // 初始化預設角色
      const batch = db.batch();
      const createdRoles: string[] = [];

      for (const role of DEFAULT_ROLES) {
        const roleRef = db.collection("roles").doc(role.id);
        const roleData: Role = {
          ...role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        
        batch.set(roleRef, roleData);
        createdRoles.push(role.displayName);
      }

      await batch.commit();
      
      logger.info(`成功初始化預設角色: ${createdRoles.join(', ')}`);
      
      return {
        roles: createdRoles,
        count: createdRoles.length,
        message: `成功初始化 ${createdRoles.length} 個預設角色`,
      };
    } catch (error: any) {
      ErrorHandler.handle(error, "初始化預設角色", contextAuth?.uid);
    }
  }
}));

/**
 * 取得所有角色列表
 */
export const getRoles = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { auth: contextAuth } = request;
    
    try {
      const rolesSnapshot = await db.collection("roles")
        .orderBy("createdAt", "asc")
        .get();
      
      // 如果沒有角色存在，允許任何已登入用戶查看（用於初始設定）
      if (!rolesSnapshot.empty) {
        // 如果已有角色，需要權限檢查
        await ensureCanManageRoles(contextAuth?.uid);
      }
      
      const roles = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      logger.info(`查詢角色列表成功，共 ${roles.length} 個角色`);
      
      return {
        roles: roles,
        count: roles.length,
        message: `查詢角色列表成功，共 ${roles.length} 個角色`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, "查詢角色列表", contextAuth?.uid);
    }
  }
}));

/**
 * 取得角色詳細資訊
 */
export const getRole = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    await ensureCanManageRoles(contextAuth?.uid);
    
    const { roleId } = data;
    
    if (!roleId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['roleId']
      });
    }

    try {
      const roleDoc = await db.collection("roles").doc(roleId).get();
      
      if (!roleDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的角色",
          resourceType: "角色",
          resourceId: roleId
        });
      }

      const roleData = {
        id: roleDoc.id,
        ...roleDoc.data()
      };
      
      logger.info(`查詢角色詳情成功: ${roleId}`);
      
      return {
        role: roleData,
        message: `查詢角色詳情成功`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `查詢角色詳情 ${roleId}`, contextAuth?.uid);
    }
  }
}));

/**
 * 指派角色給使用者
 */
export const assignUserRole = onCall(corsOptions, apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    await ensureCanManagePersonnel(contextAuth?.uid);
    
    const { userId, roleId } = data;
    
    if (!userId || !roleId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['userId', 'roleId']
      });
    }

    try {
      // 檢查角色是否存在
      const roleRef = db.collection("roles").doc(roleId);
      const roleDoc = await roleRef.get();
      
      if (!roleDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的角色",
          resourceType: "角色",
          resourceId: roleId
        });
      }

      // 檢查使用者是否存在
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的使用者",
          resourceType: "使用者",
          resourceId: userId
        });
      }

      // 更新使用者角色
      await userRef.update({
        roleRef: roleRef,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: contextAuth?.uid
      });

      const roleName = roleDoc.data()?.displayName || roleId;
      const userName = userDoc.data()?.name || userId;
      
      logger.info(`成功指派角色: ${userName} -> ${roleName}`);
      
      return {
        userId: userId,
        roleId: roleId,
        roleName: roleName,
        userName: userName,
        message: `成功將角色 ${roleName} 指派給 ${userName}`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `指派角色 ${userId} -> ${roleId}`, contextAuth?.uid);
    }
  }
}));

