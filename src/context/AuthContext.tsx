// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance, getFirestoreInstance } from '@/lib/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import { toast } from 'sonner';
import { debug, error, warn, info } from '@/utils/logger';
import { FirebaseError } from '@/types';

// 管理員員工ID白名單 (最後防線)
const ADMIN_EMPLOYEE_IDS = ['052', 'admin', 'administrator'];

// 級別權限對應
const LEVEL_PERMISSIONS: Record<UserLevel, string[]> = {
  admin: ['*'], // 所有權限
  manager: [
    'materials.view', 'materials.manage', 'materials.create', 'materials.edit',
    'products.view', 'products.manage', 'products.create', 'products.edit',
    'workOrders.view', 'workOrders.manage', 'workOrders.create', 'workOrders.edit',
    'inventory.view', 'inventory.manage',
    'time.view', 'time.manage'
  ],
  operator: [
    'materials.view', 'products.view', 'workOrders.view', 'inventory.view',
    'time.view', 'time.create', 'time.edit'
  ],
  viewer: [
    'materials.view', 'products.view', 'workOrders.view', 'inventory.view'
  ]
};

// 用戶級別類型定義
export type UserLevel = 'admin' | 'manager' | 'operator' | 'viewer';

export interface AppUser {
  uid: string;
  name: string;
  employeeId: string;
  email?: string;
  phone: string;
  status: 'active' | 'inactive';
  roleRef?: DocumentReference;
  roleName?: string;
  permissions?: string[]; // 權限陣列
  userLevel?: UserLevel; // 新增用戶級別
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

// 簡化的用戶級別判斷函數
const getUserLevel = (employeeId: string, userData: any): UserLevel => {
  // 1. 白名單管理員檢查 (最高優先級)
  if (ADMIN_EMPLOYEE_IDS.includes(employeeId)) {
    debug('🔑 員工ID在管理員白名單中，設定為 admin 級別', { employeeId });
    return 'admin';
  }

  // 2. 根據角色名稱判斷級別
  const roleName = userData.roleName || userData.name || '';
  if (roleName.includes('管理員') || roleName.includes('系統管理')) {
    return 'admin';
  }
  if (roleName.includes('領班') || roleName.includes('主管') || roleName.includes('管理')) {
    return 'manager';
  }
  if (roleName.includes('計時') || roleName.includes('記錄')) {
    return 'operator';
  }

  // 3. 預設為 operator 級別
  return 'operator';
};

// 根據級別生成權限陣列
const getUserPermissions = (userLevel: UserLevel): string[] => {
  return LEVEL_PERMISSIONS[userLevel] || LEVEL_PERMISSIONS.viewer;
};

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
        
        // 🎯 統一ID驗證：確保 uid 與 employeeId 和文檔ID 一致
        if (userData.uid !== firebaseUser.uid) {
          warn('用戶ID不一致，已自動修正', {
            firestoreUid: userData.uid,
            firebaseUid: firebaseUser.uid,
            employeeId: userData.employeeId
          } as any);
          userData.uid = firebaseUser.uid;
        }
        
        debug('用戶資料', userData);
        
        // 🚀 簡化權限載入邏輯：直接根據用戶級別分配權限

        // 1. 確定用戶級別
        const userLevel = getUserLevel(userData.employeeId, userData);
        userData.userLevel = userLevel;

        // 2. 根據級別生成權限陣列
        userData.permissions = getUserPermissions(userLevel);

        // 3. 保留原有角色名稱顯示 (向後相容)
        if (!userData.roleName || typeof userData.roleName !== 'string') {
          userData.roleName = '未設定';
        }

        debug('✅ 簡化權限載入完成', {
          employeeId: userData.employeeId,
          userLevel: userData.userLevel,
          roleName: userData.roleName,
          permissionCount: userData.permissions.length
        });
        
        // 🛡️ 備用權限檢查：白名單管理員確保有完整權限
        if (ADMIN_EMPLOYEE_IDS.includes(userData.employeeId)) {
          if (userData.userLevel !== 'admin') {
            debug('⚠️ 白名單管理員級別不正確，強制提升為 admin');
            userData.userLevel = 'admin';
            userData.permissions = getUserPermissions('admin');
            userData.roleName = '系統管理員';
          }
        }
        
        debug('最終用戶資料', { 
          name: userData.name, 
          role: userData.roleName, 
          permissionCount: userData.permissions?.length || 0,
          permissions: userData.permissions
        });
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
