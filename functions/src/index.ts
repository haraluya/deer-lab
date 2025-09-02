// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import next from "next";

// 初始化 Firebase Admin SDK，只需一次
initializeApp();

// 建立 nextServer 雲端函數
export const nextServer = onRequest({ maxInstances: 10 }, async (req, res) => {
  try {
    // 設定 Next.js 環境變量
    process.env.NODE_ENV = 'production';
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    
    const nextApp = next({
      dev: false,
      quiet: true,
      conf: {
        distDir: '.next',
        poweredByHeader: false,
        compress: true,
      },
    });
    
    const nextHandle = nextApp.getRequestHandler();
    await nextApp.prepare();
    return nextHandle(req, res);
  } catch (error) {
    console.error('Next.js app preparation failed:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Next.js application failed to initialize',
    });
  }
});

// 創建一個簡單的健康檢查函數
export const healthCheck = onRequest((request, response) => {
  response.json({ 
    status: "healthy",
    service: "鹿鹿小作坊 API Service",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

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
export * from "./api/globalCart";
export * from "./api/resetPermissions";