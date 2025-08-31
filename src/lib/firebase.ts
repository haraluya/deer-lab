// src/lib/firebase.ts
import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getFunctions, Functions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
import { firebase } from '@/utils/logger'

firebase('Firebase 模組載入...');

// 延遲初始化變數
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let storageInstance: any = null;
let isInitialized = false;

// 獲取 Firebase 配置
function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  firebase('Firebase 配置檢查:');
  firebase(`  API Key: ${config.apiKey ? '✅ 已設置' : '❌ 未設置'}`);
  firebase(`  Auth Domain: ${config.authDomain ? '✅ 已設置' : '❌ 未設置'}`);
  firebase(`  Project ID: ${config.projectId ? '✅ 已設置' : '❌ 未設置'}`);
  firebase(`  Storage Bucket: ${config.storageBucket ? '✅ 已設置' : '❌ 未設置'}`);
  firebase(`  Messaging Sender ID: ${config.messagingSenderId ? '✅ 已設置' : '❌ 未設置'}`);
  firebase(`  App ID: ${config.appId ? '✅ 已設置' : '❌ 未設置'}`);

  return config;
}

// 初始化 Firebase
function initializeFirebase() {
  if (isInitialized) {
    firebase('Firebase 已經初始化');
    return { app, auth: authInstance, db: dbInstance, functions: functionsInstance, storage: storageInstance };
  }

  try {
    firebase('開始初始化 Firebase...');
    
    const firebaseConfig = getFirebaseConfig();

    // 檢查必要的環境變數
    if (!firebaseConfig.apiKey) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable');
    }

    if (!firebaseConfig.authDomain) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN environment variable');
    }

    if (!firebaseConfig.projectId) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable');
    }

    // 初始化 Firebase
    firebase('正在初始化 Firebase App...');
    app = initializeApp(firebaseConfig);
    firebase('Firebase App 初始化成功');

    firebase('正在初始化 Firebase Auth...');
    authInstance = getAuth(app);
    firebase('Firebase Auth 初始化成功');

    firebase('正在初始化 Firestore...');
    dbInstance = getFirestore(app);
    firebase('Firestore 初始化成功');

    firebase('正在初始化 Firebase Functions...');
    functionsInstance = getFunctions(app);
    firebase('Firebase Functions 初始化成功');

    firebase('正在初始化 Firebase Storage...');
    storageInstance = getStorage(app);
    firebase('Firebase Storage 初始化成功');

    isInitialized = true;
    firebase('Firebase 所有服務初始化完成！');
    
    return { app, auth: authInstance, db: dbInstance, functions: functionsInstance, storage: storageInstance };
  } catch (error) {
    console.error('❌ Firebase 初始化失敗:', error);
    // 不拋出錯誤，而是返回 null
    return { app: null, auth: null, db: null, functions: null, storage: null };
  }
}

// 獲取 Firebase 實例的函數
function getFirebaseInstances() {
  if (!isInitialized) {
    return initializeFirebase();
  }
  return { app, auth: authInstance, db: dbInstance, functions: functionsInstance, storage: storageInstance };
}

// 導出函數
export function getAuthInstance(): Auth | null {
  return getFirebaseInstances().auth;
}

export function getFirestoreInstance(): Firestore | null {
  return getFirebaseInstances().db;
}

export function getFunctionsInstance(): Functions | null {
  return getFirebaseInstances().functions;
}

export function getStorageInstance(): any {
  return getFirebaseInstances().storage;
}

// 為了向後兼容，導出函數調用的結果
export const auth = getAuthInstance();
export const db = getFirestoreInstance();
export const functions = getFunctionsInstance();
export const storage = getStorageInstance();
export default app;
