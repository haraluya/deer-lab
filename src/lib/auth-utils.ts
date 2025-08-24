// src/lib/auth-utils.ts

// 檢查是否為靜態部署環境
export function isStaticDeployment(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.includes('web.app');
}

// 安全的頁面導航函數
export function safeNavigate(path: string): void {
  if (typeof window === 'undefined') return;
  
  // 在靜態部署環境中使用硬重定向
  if (isStaticDeployment()) {
    // 檢查是否會造成循環重定向
    const currentPath = window.location.pathname;
    if (currentPath === path) {
      console.warn('AuthUtils: 避免循環重定向', { currentPath, targetPath: path });
      return;
    }
    
    console.log('AuthUtils: 靜態部署重定向', { from: currentPath, to: path });
    window.location.href = path;
  } else {
    // 在開發環境中使用 Next.js 路由
    console.log('AuthUtils: 開發環境重定向', { to: path });
    window.location.href = path;
  }
}

// 檢查認證狀態是否穩定
export function isAuthStable(user: any, appUser: any, isLoading: boolean): boolean {
  // 如果還在載入，不穩定
  if (isLoading) return false;
  
  // 如果用戶已認證，檢查是否有完整的用戶資料
  if (user && appUser) {
    return true;
  }
  
  // 如果用戶未認證，檢查是否確實沒有用戶資料
  if (!user && !appUser) {
    return true;
  }
  
  // 其他情況（部分認證狀態）不穩定
  return false;
}

// 防抖重定向函數
let redirectTimeout: NodeJS.Timeout | null = null;
export function debouncedRedirect(path: string, delay: number = 500): void {
  if (redirectTimeout) {
    clearTimeout(redirectTimeout);
  }
  
  redirectTimeout = setTimeout(() => {
    safeNavigate(path);
  }, delay);
}
