// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";

// 初始化 Firebase Admin SDK，只需一次
initializeApp();

// 創建一個簡單的測試函數
export const testFunction = onRequest((request, response) => {
  response.json({ 
    message: "Firebase Functions are working!",
    timestamp: new Date().toISOString()
  });
});

// 匯出測試函數
export * from "./api/test";

// 匯出所有 API 函數
export * from "./api/users";
export * from "./api/suppliers";
export * from "./api/materials";
export * from "./api/fragrances";
export * from "./api/productSeries";
export * from "./api/products";
export * from "./api/purchaseOrders";
export * from "./api/inventory";
export * from "./api/workOrders";
export * from "./api/roles";
export * from "./api/personnel";
export * from "./api/auth";
