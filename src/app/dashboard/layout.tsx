// src/app/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react'; // 引入 useEffect
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Home, Users, Building, Package, FlaskConical, Library, Box,
  ShoppingCart, Factory, Calculator, ClipboardList, LogOut, ChevronDown,
  LucideIcon, Loader2, BarChart3, Warehouse, Shield, Tag, User
} from 'lucide-react';

// ... (SidebarNav 和 UserNav 元件保持不變) ...
interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  isSeparator?: false;
}

interface NavSeparator {
  isSeparator: true;
  label: string;
  href?: undefined;
  icon?: undefined;
}

type NavItem = NavLink | NavSeparator;

const navLinks: NavItem[] = [
  { href: '/dashboard', label: '系統總覽', icon: Home },
  { href: '/dashboard/profile', label: '個人資料', icon: User },
  { href: '/dashboard/personnel', label: '人員管理', icon: Users },
  // { href: '/dashboard/roles', label: '角色管理', icon: Shield }, // 已移除角色管理
  { isSeparator: true, label: '基礎資料管理' },
  { href: '/dashboard/suppliers', label: '供應商管理', icon: Building },
  { href: '/dashboard/materials', label: '物料管理', icon: Package },
  { href: '/dashboard/fragrances', label: '香精管理', icon: FlaskConical },
  { href: '/dashboard/product-series', label: '產品系列管理', icon: Library },
  { href: '/dashboard/products', label: '產品管理', icon: Box },
  { isSeparator: true, label: '生產作業管理' },
  { href: '/dashboard/purchase-orders', label: '採購管理', icon: ShoppingCart },
  { href: '/dashboard/production-calculator', label: '配方計算機', icon: Calculator },
  { href: '/dashboard/work-orders', label: '工單管理', icon: ClipboardList },
  { href: '/dashboard/inventory', label: '庫存管理', icon: Warehouse },
  { isSeparator: true, label: '數據分析' },
  { href: '/dashboard/reports', label: '報表分析', icon: BarChart3 },
  { href: '/dashboard/cost-management', label: '成本管理', icon: Calculator },
];

function SidebarNav() {
  const pathname = usePathname();
  
  // 添加調試信息
  useEffect(() => {
    console.log('SidebarNav: 當前路徑:', pathname);
    console.log('SidebarNav: 導航連結:', navLinks.map(link => link.href));
  }, [pathname]);
  
  const handleNavClick = () => {
    // 在移動版點擊導航項目後關閉側邊欄
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('-translate-x-full');
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
  };

  return (
    <nav className="flex flex-col gap-1 px-4 py-4">
      {navLinks.map((link, index) => {
        if (link.isSeparator) {
          return (
            <h2 key={`sep-${index}`} className="px-2 mt-4 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {link.label}
            </h2>
          );
        }
        const Icon = link.icon;
        const isActive = pathname === link.href;
        
        // 添加調試信息
        if (isActive) {
          console.log('SidebarNav: 當前活動頁面:', link.href);
        }
        
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserNav() {
    const { appUser, logout } = useAuth();
    const userInitial = appUser?.name ? appUser.name.charAt(0).toUpperCase() : 'U';
    
         const handleLogout = () => {
         logout();
         // 在移動版登出後關閉側邊欄
         const sidebar = document.getElementById('mobile-sidebar');
         const overlay = document.getElementById('sidebar-overlay');
         if (sidebar && overlay) {
             sidebar.classList.remove('translate-x-0');
             sidebar.classList.add('-translate-x-full');
             overlay.style.opacity = '0';
             setTimeout(() => {
                 overlay.style.display = 'none';
             }, 300);
         }
     };
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-full justify-start px-4 text-left font-normal hover:bg-muted rounded-lg transition-colors">
                    <Avatar className="h-8 w-8 mr-3 ring-2 ring-border">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium">
                            {userInitial}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none text-foreground truncate">
                            {appUser?.name || '使用者'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                            工號: {appUser?.employeeId || 'N/A'}
                        </p>
                    </div>
                    <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground flex-shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground">{appUser?.name || '使用者'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{appUser?.employeeId}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>登出</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, appUser } = useAuth();
  const router = useRouter();

  // 認證檢查
  useEffect(() => {
    if (!isLoading && !appUser) {
      console.log('❌ 未認證用戶嘗試訪問 dashboard，重定向到登入頁面');
      router.push('/');
    }
  }, [isLoading, appUser, router]);

  // 載入中顯示載入畫面
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // 未認證用戶不顯示內容
  if (!appUser) {
    return null;
  }

  // 只有在載入完成且確認有使用者資料時，才渲染儀表板佈局
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-gray-50 to-blue-50">
      {/* 側邊欄 - 桌面版 */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 h-full w-64 flex-col border-r bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="flex h-16 shrink-0 items-center border-b px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
            <Factory className="h-6 w-6 text-white" />
            <span className="ml-2 font-semibold text-white text-sm">Deer Lab 生產管理系統</span>
        </div>
        <div className="flex-1 overflow-y-auto">
            <SidebarNav />
        </div>
        <div className="mt-auto p-4 border-t bg-gray-50/50">
            <UserNav />
        </div>
      </aside>

             {/* 移動版側邊欄遮罩 */}
       <div 
         className="lg:hidden fixed inset-0 z-10 bg-black/50 transition-opacity duration-300" 
         style={{ display: 'none', opacity: 0 }} 
         id="sidebar-overlay"
         onClick={() => {
           const sidebar = document.getElementById('mobile-sidebar');
           const overlay = document.getElementById('sidebar-overlay');
           if (sidebar && overlay) {
             sidebar.classList.remove('translate-x-0');
             sidebar.classList.add('-translate-x-full');
             overlay.style.opacity = '0';
             setTimeout(() => {
               overlay.style.display = 'none';
             }, 300);
           }
         }}
       ></div>

      {/* 主內容區域 */}
      <main className="flex flex-1 flex-col lg:ml-64">
                {/* 頂部導航欄 - 移動版 */}
        <header className="lg:hidden flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => {
                const sidebar = document.getElementById('mobile-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar && overlay) {
                  if (sidebar.classList.contains('-translate-x-full')) {
                    // 打開側邊欄
                    sidebar.classList.remove('-translate-x-full');
                    sidebar.classList.add('translate-x-0');
                    overlay.style.display = 'block';
                    setTimeout(() => {
                      overlay.style.opacity = '1';
                    }, 10);
                  } else {
                    // 關閉側邊欄
                    sidebar.classList.remove('translate-x-0');
                    sidebar.classList.add('-translate-x-full');
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                      overlay.style.display = 'none';
                    }, 300);
                  }
                }
              }}
            >
             <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             </svg>
           </button>
            <Factory className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">Deer Lab</span>
          </div>
        </header>

                 {/* 移動版側邊欄 */}
         <aside className="lg:hidden fixed inset-y-0 left-0 z-20 h-full w-64 flex-col border-r bg-white shadow-xl transform -translate-x-full transition-transform duration-300 touch-none" id="mobile-sidebar">
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center">
              <Factory className="h-6 w-6 text-white" />
              <span className="ml-2 font-semibold text-white text-sm">Deer Lab</span>
            </div>
                         <button 
               className="p-2 rounded-md hover:bg-white/10 text-white"
               onClick={() => {
                 const sidebar = document.getElementById('mobile-sidebar');
                 const overlay = document.getElementById('sidebar-overlay');
                 if (sidebar && overlay) {
                   sidebar.classList.remove('translate-x-0');
                   sidebar.classList.add('-translate-x-full');
                   overlay.style.opacity = '0';
                   setTimeout(() => {
                     overlay.style.display = 'none';
                   }, 300);
                 }
               }}
             >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="mt-auto p-4 border-t bg-gray-50/50">
            <UserNav />
          </div>
        </aside>

        {/* 內容區域 */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 lg:py-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
