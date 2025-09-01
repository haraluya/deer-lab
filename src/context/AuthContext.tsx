// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance, getFirestoreInstance } from '@/lib/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import { toast } from 'sonner';
import { debug, error, warn, info } from '@/utils/logger';
import { FirebaseError } from '@/types';

export interface AppUser {
  uid: string;
  name: string;
  employeeId: string;
  phone: string;
  status: 'active' | 'inactive';
  roleRef?: DocumentReference;
  roleName?: string;
  permissions?: string[]; // 新增權限陣列
}

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isLoading: boolean;
  login: (employeeId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  // 權限檢查函數
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 載入用戶資料
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    debug('loadUserData 開始執行', { uid: firebaseUser.uid });
    try {
      const db = getFirestoreInstance();
      if (!db) {
        error('Firestore 未初始化');
        setAppUser(null);
        return;
      }
      
      debug('獲取用戶文檔', { uid: firebaseUser.uid });
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        debug('用戶文檔存在');
        const userData = userDoc.data() as AppUser;
        debug('用戶資料', userData);
        
        // 如果有角色引用，獲取角色資料
        if (userData.roleRef) {
          debug('用戶有角色引用，獲取角色資料');
          try {
            const roleDoc = await getDoc(userData.roleRef);
            if (roleDoc.exists()) {
              const roleData = roleDoc.data();
              userData.roleName = roleData.displayName || roleData.name;
              userData.permissions = roleData.permissions || [];
              debug('角色資料載入成功', { role: userData.roleName, permissions: userData.permissions });
            } else {
              warn('角色文檔不存在');
            }
          } catch (err) {
            error('載入角色資料失敗', err as Error);
          }
        } else {
          warn('用戶沒有角色引用');
        }
        
        debug('設置 appUser', userData);
        setAppUser(userData);
      } else {
        warn('用戶文檔不存在');
        setAppUser(null);
      }
    } catch (err) {
      error('載入用戶資料失敗', err as Error);
      setAppUser(null);
    }
  };

  // 登入函數
  const login = async (employeeId: string, password: string): Promise<boolean> => {
    try {
      const auth = getAuthInstance();
      if (!auth) {
        toast.error('系統初始化失敗');
        return false;
      }

      // 構建 email 格式
      const email = employeeId.includes('@') ? employeeId : `${employeeId}@deer-lab.local`;
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      await loadUserData(result.user);
      toast.success('登入成功！');
      return true;
    } catch (err) {
      const firebaseError = err as FirebaseError;
      error('登入失敗', firebaseError);
      toast.error(firebaseError.message || '登入失敗');
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
    } catch (err) {
      error('登出失敗', err as Error);
      toast.error('登出失敗');
    }
  };

  // 監聽認證狀態
  useEffect(() => {
    debug('AuthContext useEffect 開始執行');
    
    try {
      const auth = getAuthInstance();
      if (!auth) {
        error('Auth 未初始化，設置 isLoading = false');
        setIsLoading(false);
        return;
      }

      debug('設置 onAuthStateChanged 監聽器');
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          debug('onAuthStateChanged 觸發', { uid: firebaseUser?.uid || null });
          if (firebaseUser) {
            setUser(firebaseUser);
            debug('開始載入用戶資料');
            await loadUserData(firebaseUser);
          } else {
            setUser(null);
            setAppUser(null);
            debug('用戶已登出，清除狀態');
          }
          setIsLoading(false);
          debug('設置 isLoading = false');
        } catch (err) {
          error('onAuthStateChanged 回調執行失敗', err as Error);
          setIsLoading(false);
        }
      });

      return () => {
        debug('清理 onAuthStateChanged 監聽器');
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (err) {
      error('AuthContext useEffect 執行失敗', err as Error);
      setIsLoading(false);
    }
  }, []);

  // 權限檢查函數
  const hasPermission = (permission: string): boolean => {
    if (!appUser?.permissions) return false;
    return appUser.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!appUser?.permissions) return false;
    return permissions.some(permission => appUser.permissions!.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!appUser?.permissions) return false;
    return permissions.every(permission => appUser.permissions!.includes(permission));
  };

  const value = {
    user,
    appUser,
    isLoading,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
