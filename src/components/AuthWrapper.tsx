'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { safeNavigate, isAuthStable, debouncedRedirect } from '@/lib/auth-utils';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthWrapper({ children, requireAuth = true }: AuthWrapperProps) {
  const { user, appUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const redirectAttemptedRef = useRef(false);
  const lastAuthStateRef = useRef<string>('');

  useEffect(() => {
    // 如果不需要認證，直接標記為已檢查
    if (!requireAuth) {
      setAuthChecked(true);
      return;
    }

    // 檢查認證狀態是否穩定
    const authStable = isAuthStable(user, appUser, isLoading);
    if (!authStable) {
      console.log('AuthWrapper: 認證狀態不穩定，等待...', { user: !!user, appUser: !!appUser, isLoading });
      return;
    }

    // 檢查認證狀態
    const isAuthenticated = user && appUser;
    const isLoginPage = pathname === '/';
    const currentAuthState = `${isAuthenticated}-${isLoginPage}`;

    console.log('AuthWrapper: 認證檢查', {
      isAuthenticated,
      isLoginPage,
      pathname,
      authChecked,
      redirectAttempted: redirectAttemptedRef.current,
      currentAuthState,
      lastAuthState: lastAuthStateRef.current
    });

    // 防止重複處理相同的認證狀態
    if (currentAuthState === lastAuthStateRef.current && redirectAttemptedRef.current) {
      console.log('AuthWrapper: 認證狀態未變化，跳過處理');
      setAuthChecked(true);
      return;
    }

    // 更新最後的認證狀態
    lastAuthStateRef.current = currentAuthState;

    // 如果未認證且不在登入頁，重定向到登入頁
    if (!isAuthenticated && !isLoginPage) {
      console.log('AuthWrapper: 需要重定向到登入頁');
      redirectAttemptedRef.current = true;
      
      // 使用防抖重定向
      debouncedRedirect('/', 1000);
      return;
    }

    // 如果已認證且在登入頁，重定向到 dashboard
    if (isAuthenticated && isLoginPage) {
      console.log('AuthWrapper: 需要重定向到 dashboard');
      redirectAttemptedRef.current = true;
      
      // 使用防抖重定向
      debouncedRedirect('/dashboard', 1000);
      return;
    }

    // 其他情況，標記為已檢查
    console.log('AuthWrapper: 認證狀態正常，允許渲染');
    setAuthChecked(true);
  }, [user, appUser, isLoading, pathname, requireAuth]);

  // 如果正在載入，顯示載入畫面
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">正在載入系統...</p>
          <p className="mt-2 text-sm text-gray-500">請稍候</p>
        </div>
      </div>
    );
  }

  // 如果不需要認證，直接渲染子組件
  if (!requireAuth) {
    return <>{children}</>;
  }

  // 檢查認證狀態
  const isAuthenticated = user && appUser;
  const isLoginPage = pathname === '/';

  // 如果未認證且不在登入頁，顯示載入畫面（等待重定向）
  if (!isAuthenticated && !isLoginPage && !authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">正在跳轉到登入頁...</p>
        </div>
      </div>
    );
  }

  // 如果已認證且在登入頁，顯示載入畫面（等待重定向）
  if (isAuthenticated && isLoginPage && !authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">正在跳轉到系統...</p>
          <p className="text-sm text-gray-400 mt-2">用戶ID: {user?.uid}</p>
        </div>
      </div>
    );
  }

  // 其他情況，正常渲染
  return <>{children}</>;
}
