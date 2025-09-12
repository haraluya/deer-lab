// functions/src/api/users.ts
// 暫時停用以修復部署錯誤 - 前端使用統一API客戶端
// 參考：D:\APP\deer-lab\統一API客戶端使用指南.md

import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();
const auth = getAuth();

// 簡化版本，只提供基本功能
export const setUserStatus = onCall(async (request) => {
  try {
    const { data } = request;
    const { uid, status } = data;
    
    if (!uid || !status) {
      throw new HttpsError("invalid-argument", "缺少必要參數");
    }

    await db.collection("users").doc(uid).update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { uid, status, message: "用戶狀態更新成功" };
  } catch (error) {
    logger.error("更新用戶狀態失敗:", error);
    throw new HttpsError("internal", "更新用戶狀態失敗");
  }
});

// 其他函數暫時停用，等待 apiWrapper 系統修復
/*
export const createUser = ...
export const updateUser = ...
*/