// functions/src/api/roles.ts
// 暫時停用以修復部署錯誤 - 前端使用統一API客戶端
// 參考：D:\APP\deer-lab\統一API客戶端使用指南.md

import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

// 簡化版本，只提供基本功能
export const getRoles = onCall(async (request) => {
  try {
    const rolesSnapshot = await db.collection("roles").get();
    const roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { roles };
  } catch (error) {
    logger.error("獲取角色失敗:", error);
    throw new HttpsError("internal", "獲取角色失敗");
  }
});

export const initializeDefaultRoles = onCall(async (request) => {
  try {
    // 檢查是否已有角色
    const existingRoles = await db.collection("roles").get();
    if (!existingRoles.empty) {
      return { message: "角色已存在，無需初始化" };
    }

    // 創建預設角色
    const defaultRoles = [
      {
        name: "admin",
        displayName: "系統管理員",
        description: "擁有系統全部權限，可管理所有功能和用戶",
        permissions: ["all"],
        color: "#dc2626",
        isDefault: true
      },
      {
        name: "foreman",
        displayName: "生產領班",
        description: "負責生產管理，可管理工單、物料、產品，無成員管理權限",
        permissions: ["production"],
        color: "#2563eb",
        isDefault: true
      },
      {
        name: "timekeeper",
        displayName: "計時人員",
        description: "主要負責工時記錄，可查看生產資料但無法編輯",
        permissions: ["time"],
        color: "#059669",
        isDefault: true
      }
    ];

    const batch = db.batch();
    for (const role of defaultRoles) {
      const roleRef = db.collection("roles").doc();
      batch.set(roleRef, {
        ...role,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    return { message: "預設角色建立成功" };
  } catch (error) {
    logger.error("初始化角色失敗:", error);
    throw new HttpsError("internal", "初始化角色失敗");
  }
});

// 其他函數暫時停用，等待 apiWrapper 系統修復
/*
export const createRole = ...
export const updateRole = ...
export const deleteRole = ...
export const assignUserRole = ...
*/