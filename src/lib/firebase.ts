// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";

// 正確的 Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCMIAqNPsIyl3fJNllqNCuUJE2Rvcdf6fk",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.firebasestorage.app",
  messagingSenderId: "554942047858",
  appId: "1:554942047858:web:607d3e27bb438c898644eb"
};

// 初始化 Firebase 實例
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

try {
  // 嘗試初始化 Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  
  // 如果初始化失敗，創建基本的模擬實例
  app = {} as FirebaseApp;
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signInWithEmailAndPassword: () => Promise.resolve({} as any),
    signOut: () => Promise.resolve(),
  } as unknown as Auth;
  
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
  functions = {} as Functions;
}

export { app, auth, db, storage, functions };
