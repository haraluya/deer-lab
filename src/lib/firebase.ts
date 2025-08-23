// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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

// 檢查環境變數是否存在
const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// 初始化 Firebase 實例
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  if (isStaticExport || !hasValidConfig) {
    // 靜態匯出模式或缺少配置：創建模擬實例
    app = {
      name: 'dummy-app',
      options: {},
      automaticDataCollectionEnabled: false,
    } as unknown as FirebaseApp;
    
    auth = {
      currentUser: null,
      onAuthStateChanged: () => () => {},
      signInWithEmailAndPassword: () => Promise.resolve({} as any),
      signOut: () => Promise.resolve(),
    } as unknown as Auth;
    
    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.resolve({ data: () => null, exists: false }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
          delete: () => Promise.resolve(),
        }),
        get: () => Promise.resolve({ docs: [], empty: true }),
        add: () => Promise.resolve({ id: 'dummy-id' } as any),
      }),
    } as unknown as Firestore;
    
    storage = {
      ref: () => ({
        put: () => Promise.resolve({} as any),
        getDownloadURL: () => Promise.resolve('dummy-url'),
      }),
    } as unknown as FirebaseStorage;
  } else {
    // 正常模式：初始化 Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
} catch (error) {
  console.warn('Firebase initialization failed, using mock instances:', error);
  
  // 如果初始化失敗，使用模擬實例
  app = { name: 'dummy-app', options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
  auth = { currentUser: null, onAuthStateChanged: () => () => {} } as unknown as Auth;
  db = { collection: () => ({}) } as unknown as Firestore;
  storage = { ref: () => ({}) } as unknown as FirebaseStorage;
}

export { app, auth, db, storage };
