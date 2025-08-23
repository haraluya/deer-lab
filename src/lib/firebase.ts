// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "deer-lab",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "deer-lab.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy-app-id",
};

// 檢查是否在靜態匯出模式
const isStaticExport = process.env.NODE_ENV === 'production' && typeof window === 'undefined';

// 檢查環境變數是否存在，如果不存在則使用預設值或顯示警告
const missingVars = Object.entries(firebaseConfig)
  .filter(([key, value]) => !process.env[`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`])
  .map(([key]) => key);

if (missingVars.length > 0 && !isStaticExport) {
  console.warn(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
  console.warn('Please create a .env.local file with the required Firebase configuration.');
}

// 在靜態匯出模式下，創建一個模擬的 Firebase 實例
let app;
let auth;
let db;
let storage;

if (isStaticExport) {
  // 靜態匯出模式：創建模擬實例
  app = { name: 'dummy-app' };
  auth = { currentUser: null };
  db = { collection: () => ({}) };
  storage = { ref: () => ({}) };
} else {
  // 正常模式：初始化 Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
