// src/lib/navigation.ts

// 檢查是否為靜態部署環境
export function isStaticDeployment(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.includes('web.app');
}

// 穩定的頁面導航函數
export function navigateTo(path: string): void {
  if (typeof window === 'undefined') return;
  
  const currentPath = window.location.pathname;
  
  // 避免重定向到相同頁面
  if (currentPath === path) {
    console.warn('Navigation: 避免重定向到相同頁面', { currentPath, targetPath: path });
    return;
  }
  
  console.log('Navigation: 導航到', { from: currentPath, to: path });
  
  // 在靜態部署環境中使用硬重定向
  if (isStaticDeployment()) {
    window.location.href = path;
  } else {
    // 在開發環境中也使用硬重定向，確保一致性
    window.location.href = path;
  }
}

// 防抖導航函數
let navigationTimeout: NodeJS.Timeout | null = null;
export function debouncedNavigate(path: string, delay: number = 500): void {
  if (navigationTimeout) {
    clearTimeout(navigationTimeout);
  }
  
  navigationTimeout = setTimeout(() => {
    navigateTo(path);
  }, delay);
}

// 檢查當前路徑是否需要認證
export function requiresAuth(path: string): boolean {
  const authRoutes = [
    '/dashboard',
    '/dashboard/personnel',
    '/dashboard/roles',
    '/dashboard/material-categories',
    '/dashboard/suppliers',
    '/dashboard/materials',
    '/dashboard/fragrances',
    '/dashboard/product-series',
    '/dashboard/products',
    '/dashboard/purchase-orders',
    '/dashboard/production-calculator',
    '/dashboard/work-orders',
    '/dashboard/inventory',
    '/dashboard/reports',
    '/dashboard/cost-management',
  ];
  
  return authRoutes.some(route => path.startsWith(route));
}
