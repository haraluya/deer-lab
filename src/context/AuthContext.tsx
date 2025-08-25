// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface AppUser extends DocumentData {
  uid: string;
  name: string;
  employeeId: string;
  phone: string;
  status: 'active' | 'inactive';
  roleRef: DocumentReference;
  roleName?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isLoading: boolean;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  isLoading: true,
  logout: () => {},
  refreshUserData: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 載入用戶資料的函數
  const loadUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      console.log('🔍 開始載入用戶資料:', firebaseUser.uid);
      
      // 從 Firestore 獲取用戶資料
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as AppUser;
        console.log('✅ 找到用戶資料:', userData);
        
        // 如果有角色引用，獲取角色資料
        if (userData.roleRef) {
          try {
            const roleDoc = await getDoc(userData.roleRef);
            if (roleDoc.exists()) {
              const roleData = roleDoc.data();
              userData.roleName = roleData.name;
              userData.permissions = roleData.permissions || [];
              console.log('✅ 載入角色資料:', {
                roleName: userData.roleName,
                permissions: userData.permissions
              });
            }
          } catch (roleError) {
            console.error('❌ 載入角色資料失敗:', roleError);
          }
        }
        
        setAppUser(userData);
        console.log('✅ 用戶資料已設置到狀態');
      } else {
        console.log('❌ 用戶資料不存在於 Firestore');
        setAppUser(null);
      }
    } catch (error) {
      console.error('❌ 載入用戶資料失敗:', error);
      setAppUser(null);
    }
  }, []);

  // 刷新用戶資料
  const refreshUserData = useCallback(async () => {
    if (user) {
      await loadUserData(user);
    }
  }, [user, loadUserData]);

  useEffect(() => {
    console.log('🚀 AuthContext 初始化');
    
    if (!auth || !db) {
      console.error('❌ Firebase 未正確初始化');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 認證狀態變更:', firebaseUser?.uid);
      
      if (!isMounted) return;

      if (firebaseUser) {
        console.log('✅ 用戶已認證:', firebaseUser.uid);
        setUser(firebaseUser);
        
        // 載入用戶資料
        await loadUserData(firebaseUser);
      } else {
        console.log('🚪 用戶已登出');
        setUser(null);
        setAppUser(null);
      }
      
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      console.log('🧹 清理 AuthContext');
      isMounted = false;
      unsubscribe();
    };
  }, [loadUserData]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success("您已成功登出。");
      window.location.href = '/';
    } catch (error) {
      console.error('❌ 登出失敗:', error);
      toast.error("登出時發生錯誤。");
    }
  }, []);

  const value = useMemo(() => ({
    user,
    appUser,
    isLoading,
    logout,
    refreshUserData,
  }), [user, appUser, isLoading, logout, refreshUserData]);

  console.log('📊 AuthContext 狀態:', {
    user: user?.uid,
    appUser: appUser?.uid,
    appUserName: appUser?.name,
    roleName: appUser?.roleName,
    permissions: appUser?.permissions?.length,
    isLoading
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
