// src/lib/auth-guard.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// 定義路由配置
interface RouteConfig {
  path: string;
  requiresAuth: boolean;
  redirectTo?: string;
}

// 路由配置
const ROUTES: RouteConfig[] = [
  { path: '/', requiresAuth: false, redirectTo: '/dashboard' },
  { path: '/dashboard', requiresAuth: true },
  { path: '/dashboard/personnel', requiresAuth: true },
  { path: '/dashboard/roles', requiresAuth: true },
  { path: '/dashboard/material-categories', requiresAuth: true },
  { path: '/dashboard/suppliers', requiresAuth: true },
  { path: '/dashboard/materials', requiresAuth: true },
  { path: '/dashboard/fragrances', requiresAuth: true },
  { path: '/dashboard/product-series', requiresAuth: true },
  { path: '/dashboard/products', requiresAuth: true },
  { path: '/dashboard/purchase-orders', requiresAuth: true },
  { path: '/dashboard/production-calculator', requiresAuth: true },
  { path: '/dashboard/work-orders', requiresAuth: true },
  { path: '/dashboard/inventory', requiresAuth: true },
  { path: '/dashboard/reports', requiresAuth: true },
  { path: '/dashboard/cost-management', requiresAuth: true },
];

// 認證守衛 Hook
export function useAuthGuard() {
  const { user, appUser, isLoading } = useAuth();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthGuard: 狀態更新', { 
      isLoading, 
      user: user?.uid, 
      appUser: appUser?.uid, 
      pathname 
    });

    // 如果還在載入，等待
    if (isLoading) {
      console.log('AuthGuard: 正在載入，等待認證狀態...');
      return;
    }

    // 找到當前路由配置
    const currentRoute = ROUTES.find(route => route.path === pathname);
    
    // 如果找不到路由配置，允許訪問（可能是動態路由）
    if (!currentRoute) {
      console.log('AuthGuard: 未找到路由配置，允許訪問', pathname);
      setShouldRender(true);
      return;
    }

    const isAuthenticated = user && appUser;
    const requiresAuth = currentRoute.requiresAuth;

    console.log('AuthGuard: 檢查路由', {
      pathname,
      requiresAuth,
      isAuthenticated,
      user: !!user,
      appUser: !!appUser,
      redirectTo: currentRoute.redirectTo
    });

    // 如果路由需要認證但用戶未認證
    if (requiresAuth && !isAuthenticated) {
      console.log('AuthGuard: 需要認證但未認證，重定向到登入頁');
      setRedirectPath('/');
      setShouldRender(false);
      return;
    }

    // 如果路由不需要認證但用戶已認證，且有重定向配置
    if (!requiresAuth && isAuthenticated && currentRoute.redirectTo) {
      console.log('AuthGuard: 已認證但訪問登入頁，重定向到 dashboard');
      setRedirectPath(currentRoute.redirectTo);
      setShouldRender(false);
      return;
    }

    // 其他情況，允許渲染
    console.log('AuthGuard: 允許渲染頁面');
    setShouldRender(true);
    setRedirectPath(null);
  }, [user, appUser, isLoading, pathname]);

  // 執行重定向
  useEffect(() => {
    if (redirectPath && typeof window !== 'undefined') {
      console.log('AuthGuard: 執行重定向', redirectPath);
      window.location.href = redirectPath;
    }
  }, [redirectPath]);

  return {
    shouldRender,
    isLoading,
    isAuthenticated: user && appUser,
    redirectPath
  };
}

// 載入組件
export function LoadingScreen({ message = "正在載入系統..." }: { message?: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        <p className="mt-2 text-sm text-gray-500">請稍候</p>
      </div>
    </div>
  );
}

// 認證守衛組件
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { shouldRender, isLoading, redirectPath } = useAuthGuard();

  // 如果正在載入
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 如果有重定向路徑
  if (redirectPath) {
    return <LoadingScreen message="正在跳轉..." />;
  }

  // 如果不應該渲染
  if (!shouldRender) {
    return <LoadingScreen message="正在檢查權限..." />;
  }

  // 允許渲染
  return <>{children}</>;
}
