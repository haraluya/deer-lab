// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "deer-lab",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "deer-lab.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy-app-id",
};

// 檢查是否在靜態匯出模式
const isStaticExport = typeof window === 'undefined' || process.env.NODE_ENV === 'production';

// 檢查環境變數是否存在
const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// 初始化 Firebase 實例
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

try {
  if (isStaticExport || !hasValidConfig) {
    // 靜態匯出模式或缺少配置：創建模擬實例
    console.warn('Firebase: Using mock instances for static export or missing config');
    
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
      _getRecaptchaConfig: () => ({
        isProviderEnabled: () => false, // 添加這個方法避免錯誤
        getRecaptchaToken: () => Promise.resolve('dummy-token'),
      }),
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

    // 創建模擬的 Functions 實例
    const mockHttpsCallable = (name: string) => {
      return async (data?: any) => {
        console.warn(`Mock function called: ${name}`, data);
        return Promise.resolve({ data: { status: 'success', message: 'Mock function executed' } });
      };
    };

    functions = {
      httpsCallable: mockHttpsCallable,
    } as unknown as Functions;
  } else {
    // 正常模式：初始化 Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    
    // 在開發環境中連接模擬器（如果需要的話）
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // 可以選擇性地連接模擬器
      // connectAuthEmulator(auth, 'http://localhost:9099');
      // connectFirestoreEmulator(db, 'localhost', 8080);
      // connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  }
} catch (error) {
  console.warn('Firebase initialization failed, using mock instances:', error);
  
  // 如果初始化失敗，使用模擬實例
  app = { name: 'dummy-app', options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
  auth = { 
    currentUser: null, 
    onAuthStateChanged: () => () => {},
    _getRecaptchaConfig: () => ({
      isProviderEnabled: () => false, // 添加這個方法避免錯誤
      getRecaptchaToken: () => Promise.resolve('dummy-token'),
    })
  } as unknown as Auth;
  db = { collection: () => ({}) } as unknown as Firestore;
  storage = { ref: () => ({}) } as unknown as FirebaseStorage;
  
  // 創建模擬的 Functions 實例
  const mockHttpsCallable = (name: string) => {
    return async (data?: any) => {
      console.warn(`Mock function called: ${name}`, data);
      return Promise.resolve({ data: { status: 'success', message: 'Mock function executed' } });
    };
  };

  functions = { httpsCallable: mockHttpsCallable } as unknown as Functions;
}

export { app, auth, db, storage, functions };
