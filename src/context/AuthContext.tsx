// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance, getFirestoreInstance } from '@/lib/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import { toast } from 'sonner';

export interface AppUser {
  uid: string;
  name: string;
  employeeId: string;
  phone: string;
  status: 'active' | 'inactive';
  roleRef?: DocumentReference;
  roleName?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 載入用戶資料
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    console.log('🔧 loadUserData 開始執行，用戶 UID:', firebaseUser.uid);
    try {
      const db = getFirestoreInstance();
      if (!db) {
        console.error('❌ Firestore 未初始化');
        return;
      }
      
      console.log('🔧 獲取用戶文檔:', firebaseUser.uid);
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        console.log('✅ 用戶文檔存在');
        const userData = userDoc.data() as AppUser;
        console.log('🔧 用戶資料:', userData);
        
        // 如果有角色引用，獲取角色資料
        if (userData.roleRef) {
          console.log('🔧 用戶有角色引用，獲取角色資料');
          try {
            const roleDoc = await getDoc(userData.roleRef);
            if (roleDoc.exists()) {
              const roleData = roleDoc.data();
              userData.roleName = roleData.name;
              userData.permissions = roleData.permissions || [];
              console.log('✅ 角色資料載入成功:', roleData);
            } else {
              console.warn('⚠️ 角色文檔不存在');
            }
          } catch (error) {
            console.error('❌ 載入角色資料失敗:', error);
          }
        } else {
          console.warn('⚠️ 用戶沒有角色引用');
        }
        
        console.log('🔧 設置 appUser:', userData);
        setAppUser(userData);
      } else {
        console.warn('⚠️ 用戶文檔不存在');
        setAppUser(null);
      }
    } catch (error) {
      console.error('❌ 載入用戶資料失敗:', error);
      setAppUser(null);
    }
  };

  // 登入函數
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const auth = getAuthInstance();
      if (!auth) {
        toast.error('系統初始化失敗');
        return false;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      await loadUserData(result.user);
      toast.success('登入成功！');
      return true;
    } catch (error: any) {
      console.error('❌ 登入失敗:', error);
      toast.error(error.message || '登入失敗');
      return false;
    }
  };

  // 登出函數
  const logout = async () => {
    try {
      const auth = getAuthInstance();
      if (auth) {
        await signOut(auth);
        setUser(null);
        setAppUser(null);
        toast.success('已成功登出');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ 登出失敗:', error);
      toast.error('登出失敗');
    }
  };

  // 監聽認證狀態
  useEffect(() => {
    console.log('🔧 AuthContext useEffect 開始執行');
    const auth = getAuthInstance();
    if (!auth) {
      console.error('❌ Auth 未初始化，設置 isLoading = false');
      setIsLoading(false);
      return;
    }

    console.log('🔧 設置 onAuthStateChanged 監聽器');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔧 onAuthStateChanged 觸發，用戶:', firebaseUser ? firebaseUser.uid : 'null');
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log('🔧 開始載入用戶資料');
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
        setAppUser(null);
        console.log('🔧 用戶已登出，清除狀態');
      }
      setIsLoading(false);
      console.log('🔧 設置 isLoading = false');
    });

    return () => {
      console.log('🔧 清理 onAuthStateChanged 監聽器');
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    appUser,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
