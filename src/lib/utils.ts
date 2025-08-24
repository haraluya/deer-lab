import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 通用的路由導航函數，支援靜態部署環境
export function navigateTo(path: string) {
  if (typeof window !== 'undefined') {
    // 使用安全的導航函數
    import('./auth-utils').then(({ safeNavigate }) => {
      safeNavigate(path);
    }).catch(() => {
      // 回退到硬重定向
      window.location.href = path;
    });
  }
}
