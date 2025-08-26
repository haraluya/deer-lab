// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import next from "next";

// 初始化 Firebase Admin SDK，只需一次
initializeApp();

// 初始化 Next.js App
const nextApp = next({
  dev: false,
  conf: { distDir: ".next" },
});
const nextHandle = nextApp.getRequestHandler();

// 建立 nextServer 雲端函數
export const nextServer = onRequest({ maxInstances: 10 }, async (req, res) => {
  try {
    await nextApp.prepare();
    return nextHandle(req, res);
  } catch (error) {
    console.error('Next.js app preparation failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

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