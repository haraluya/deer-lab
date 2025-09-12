"use strict";
// functions/src/api/auth.ts
// 注意：此檔案的函數已被統一API客戶端取代，暫時註解以修復部署錯誤
// 參考：D:\APP\deer-lab\統一API客戶端使用指南.md
// 
// 前端已完全使用統一API客戶端架構，這些直接的 Firebase Functions 調用不再需要
// 如需重新啟用，請修復 apiWrapper 相關的類型錯誤
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlaceholder = void 0;
// 暫時導出空物件以避免模組載入錯誤
exports.authPlaceholder = {
    message: "Auth functions temporarily disabled for deployment fix"
};
/*
// 原始程式碼已註解，等待修復 apiWrapper 系統後重新啟用
//
// import { logger } from "firebase-functions";
// import { onCall, HttpsError } from "firebase-functions/v2/https";
// import { getAuth } from "firebase-admin/auth";
// import { getFirestore } from "firebase-admin/firestore";
// import { apiWrapper } from "../utils/apiWrapper";
// import { BusinessError, ApiErrorCode } from "../utils/errorHandler";
//
// const auth = getAuth();
// const db = getFirestore();
//
// export const loginWithEmployeeId = onCall(async (request) => {
//   // ... 原始實作
// });
//
// export const verifyPassword = onCall(async (request) => {
//   // ... 原始實作
// });
*/ 
//# sourceMappingURL=auth.js.map