// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";

// 初始化 Firebase Admin SDK，只需一次
initializeApp();

// 從 /api 資料夾中匯出所有模組的 Cloud Functions
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
