'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { navigateTo } from '@/lib/utils';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthWrapper({ children, requireAuth = true }: AuthWrapperProps) {
  const { user, appUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // 防止重複重定向
    if (hasRedirected) return;

    // 如果不需要認證，直接返回
    if (!requireAuth) return;

    // 如果還在載入中，等待
    if (isLoading) return;

    // 檢查認證狀態
    const isAuthenticated = user && appUser;
    const isLoginPage = pathname === '/';

    console.log('AuthWrapper: 檢查認證狀態', {
      isAuthenticated,
      isLoginPage,
      pathname,
      hasRedirected
    });

    if (!isAuthenticated && !isLoginPage) {
      // 未認證且不在登入頁，重定向到登入頁
      console.log('AuthWrapper: 重定向到登入頁');
      setHasRedirected(true);
      navigateTo('/');
      return;
    }

    if (isAuthenticated && isLoginPage) {
      // 已認證且在登入頁，重定向到 dashboard
      console.log('AuthWrapper: 重定向到 dashboard');
      setHasRedirected(true);
      navigateTo('/dashboard');
      return;
    }
  }, [user, appUser, isLoading, pathname, requireAuth, hasRedirected]);

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
  if (!isAuthenticated && !isLoginPage) {
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
  if (isAuthenticated && isLoginPage) {
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
