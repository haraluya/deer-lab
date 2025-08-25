// src/lib/firebase.ts
import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getFunctions, Functions } from 'firebase/functions'

console.log('🔧 Firebase 模組載入...');

// 延遲初始化變數
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
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

  console.log('🔧 Firebase 配置檢查:');
  console.log('  API Key:', config.apiKey ? '✅ 已設置' : '❌ 未設置');
  console.log('  Auth Domain:', config.authDomain ? '✅ 已設置' : '❌ 未設置');
  console.log('  Project ID:', config.projectId ? '✅ 已設置' : '❌ 未設置');
  console.log('  Storage Bucket:', config.storageBucket ? '✅ 已設置' : '❌ 未設置');
  console.log('  Messaging Sender ID:', config.messagingSenderId ? '✅ 已設置' : '❌ 未設置');
  console.log('  App ID:', config.appId ? '✅ 已設置' : '❌ 未設置');

  return config;
}

// 初始化 Firebase
function initializeFirebase() {
  if (isInitialized) {
    console.log('✅ Firebase 已經初始化');
    return { app, auth: authInstance, db: dbInstance, functions: functionsInstance };
  }

  try {
    console.log('🔧 開始初始化 Firebase...');
    
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
    console.log('🚀 正在初始化 Firebase App...');
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase App 初始化成功');

    console.log('🚀 正在初始化 Firebase Auth...');
    authInstance = getAuth(app);
    console.log('✅ Firebase Auth 初始化成功');

    console.log('🚀 正在初始化 Firestore...');
    dbInstance = getFirestore(app);
    console.log('✅ Firestore 初始化成功');

    console.log('🚀 正在初始化 Firebase Functions...');
    functionsInstance = getFunctions(app);
    console.log('✅ Firebase Functions 初始化成功');

    isInitialized = true;
    console.log('🎉 Firebase 所有服務初始化完成！');
    
    return { app, auth: authInstance, db: dbInstance, functions: functionsInstance };
  } catch (error) {
    console.error('❌ Firebase 初始化失敗:', error);
    // 不拋出錯誤，而是返回 null
    return { app: null, auth: null, db: null, functions: null };
  }
}

// 獲取 Firebase 實例的函數
function getFirebaseInstances() {
  if (!isInitialized) {
    return initializeFirebase();
  }
  return { app, auth: authInstance, db: dbInstance, functions: functionsInstance };
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

// 為了向後兼容，導出函數調用的結果
export const auth = getAuthInstance();
export const db = getFirestoreInstance();
export const functions = getFunctionsInstance();
export default app;
