// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import next from "next";

// 初始化 Firebase Admin SDK，只需一次
initializeApp();

// 初始化 Next.js App 在全域範圍
const nextApp = next({
  dev: false,
  dir: process.cwd(),
});
const nextHandle = nextApp.getRequestHandler();

// 全域準備狀態追蹤
let isNextAppPrepared = false;
let preparingPromise: Promise<void> | null = null;

// 確保 Next.js App 只準備一次的輔助函數
async function ensureNextAppPrepared(): Promise<void> {
  if (isNextAppPrepared) {
    return;
  }
  
  if (preparingPromise) {
    return preparingPromise;
  }
  
  preparingPromise = nextApp.prepare().then(() => {
    isNextAppPrepared = true;
    preparingPromise = null;
  });
  
  return preparingPromise;
}

// 建立 nextServer 雲端函數 - 優化設定以降低費用
export const nextServer = onRequest({ 
  maxInstances: 3,        // 降低實例數量以節省費用
  memory: '512MiB',       // 限制記憶體使用
  timeoutSeconds: 60,     // 設定超時時間
  concurrency: 10,        // 提高併發處理能力
  cpu: 1,                 // 限制 CPU 使用
  preserveExternalChanges: false,  // 🚫 強制關閉原始碼備份
  labels: {
    'backup': 'disabled',           // 🚫 標記備份已停用
    'source-backup': 'false'        // 🚫 明確指定不備份原始碼
  }
}, async (req, res) => {
  try {
    // 設定快取標頭以減少重複請求
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    
    // 確保 Next.js App 只準備一次，避免 EventEmitter 內存洩漏
    await ensureNextAppPrepared();
    return nextHandle(req, res);
  } catch (error) {
    console.error('Next.js app preparation failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 創建一個簡單的健康檢查函數
export const healthCheck = onRequest((request, response) => {
  response.json({ 
    status: "healthy",
    service: "德科斯特的實驗室 API Service",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// 匯出核心業務 API 函數
export * from "./api/users";
export * from "./api/suppliers";
export * from "./api/materials";
export * from "./api/fragrances";
export * from "./api/products";
export * from "./api/productSeries";
export * from "./api/purchaseOrders";
export * from "./api/inventory";
export * from "./api/workOrders";
export * from "./api/roles";
export * from "./api/personnel";
export * from "./api/timeRecords";
export * from "./api/globalCart";

