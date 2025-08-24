import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 通用的路由導航函數，支援靜態部署環境
export function navigateTo(path: string) {
  if (typeof window !== 'undefined') {
    // 在靜態部署環境中使用硬重定向
    window.location.href = path;
  } else {
    // 在開發環境中使用 Next.js 路由
    // 這裡需要動態導入 router，因為在伺服器端無法使用 useRouter
    import('next/navigation').then(({ useRouter }) => {
      const router = useRouter();
      router.push(path);
    }).catch(() => {
      // 如果無法使用 Next.js 路由，回退到硬重定向
      if (typeof window !== 'undefined') {
        window.location.href = path;
      }
    });
  }
}
