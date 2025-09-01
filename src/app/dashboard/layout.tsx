// src/app/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react'; // 引入 useEffect
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useGlobalCart } from '@/hooks/useGlobalCart';
import { usePermission } from '@/hooks/usePermission';
import { PAGE_PERMISSIONS } from '@/utils/permissions';
import {
  Home, Users, Building, Package, FlaskConical, Library, Box,
  ShoppingCart, Factory, Calculator, ClipboardList, LogOut, ChevronDown,
  LucideIcon, Loader2, Warehouse, Shield, Tag, Clock, FileBarChart, 
  Beaker, PackageSearch, TrendingUp, UserCheck, Settings
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
  { href: '/dashboard', label: '工作台', icon: Home },
  
  { isSeparator: true, label: '團隊管理' },
  { href: '/dashboard/personnel', label: '成員管理', icon: UserCheck },
  { href: '/dashboard/personnel/permissions', label: '權限管理', icon: Shield },
  { href: '/dashboard/debug-permissions', label: '🔧 權限調試', icon: Settings },
  { href: '/dashboard/time-records', label: '工時統計', icon: Clock },
  
  { isSeparator: true, label: '供應鏈' },
  { href: '/dashboard/suppliers', label: '供應商', icon: Building },
  { href: '/dashboard/purchase-orders', label: '採購訂單', icon: ShoppingCart },
  
  { isSeparator: true, label: '生產中心' },
  { href: '/dashboard/materials', label: '原料庫', icon: Package },
  { href: '/dashboard/fragrances', label: '配方庫', icon: Beaker },
  { href: '/dashboard/products', label: '產品目錄', icon: Box },
  { href: '/dashboard/work-orders', label: '生產工單', icon: Factory },
  
  { isSeparator: true, label: '營運分析' },
  { href: '/dashboard/inventory', label: '庫存監控', icon: PackageSearch },
  { href: '/dashboard/inventory-records', label: '庫存歷史', icon: ClipboardList },
  { href: '/dashboard/cost-management', label: '成本分析', icon: TrendingUp },
  { href: '/dashboard/time-reports', label: '工時報表', icon: FileBarChart },
];

function SidebarNav() {
  const pathname = usePathname();
  const { cartItemCount, isLoading } = useGlobalCart();
  const { canAccess, isAdmin } = usePermission();
  
  // 添加調試信息和購物車狀態監控
  useEffect(() => {
    console.log('SidebarNav: 當前路徑:', pathname);
    console.log('SidebarNav: 導航連結:', navLinks.map(link => link.href));
    console.log('SidebarNav: 購物車數量:', cartItemCount);
    console.log('SidebarNav: 購物車數量類型:', typeof cartItemCount);
    
    if (cartItemCount > 0) {
      console.log('SidebarNav: 購物車有項目，將顯示氣泡');
    }
  }, [pathname, cartItemCount]);
  
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

  // 智能過濾導航項目，包括分組管理
  const getFilteredNavLinks = () => {
    const result: NavItem[] = [];
    let currentGroupHasVisibleItems = false;
    let pendingGroup: NavSeparator | null = null;

    // 添加除錯資訊
    console.log('🔍 SidebarNav 權限過濾開始');

    for (let i = 0; i < navLinks.length; i++) {
      const link = navLinks[i];
      
      if (link.isSeparator) {
        // 如果之前的分組有可見項目，先加入該分組
        if (pendingGroup && currentGroupHasVisibleItems) {
          result.push(pendingGroup);
        }
        
        // 重置狀態並記住當前分組
        pendingGroup = link;
        currentGroupHasVisibleItems = false;
        console.log('📁 分組:', link.label);
      } else {
        // 特殊處理：工作台和權限管理頁面
        let hasAccess = false;
        
        if (link.href === '/dashboard') {
          hasAccess = true; // 工作台對所有人開放
        } else if (link.href === '/dashboard/personnel/permissions' || link.href === '/dashboard/debug-permissions') {
          // 權限管理和調試頁面需要特殊檢查
          hasAccess = canAccess(link.href) || isAdmin();
        } else {
          // 一般頁面權限檢查，加入容錯處理
          try {
            hasAccess = canAccess(link.href);
            
            // 如果沒有權限但是管理員，允許訪問
            if (!hasAccess && isAdmin()) {
              hasAccess = true;
              console.log(`🔑 管理員權限允許訪問: ${link.label}`);
            }
          } catch (error) {
            console.warn(`⚠️  權限檢查失敗: ${link.href}`, error);
            // 如果是管理員，即使權限檢查失敗也允許訪問
            hasAccess = isAdmin();
          }
        }
        
        console.log(`📄 ${link.label} (${link.href}): ${hasAccess ? '✅' : '❌'}`);
        
        if (hasAccess) {
          // 如果有權限且還沒加入分組標題，先加入標題
          if (pendingGroup && !currentGroupHasVisibleItems) {
            result.push(pendingGroup);
            currentGroupHasVisibleItems = true;
          }
          
          result.push(link);
        }
      }
    }

    console.log(`✅ 過濾完成，顯示 ${result.filter(item => !item.isSeparator).length} 個導航項目`);
    return result;
  };

  const filteredNavLinks = getFilteredNavLinks();

  return (
    <nav className="flex flex-col gap-1 px-4 py-4">
      {filteredNavLinks.map((link, index) => {
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
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 relative",
              isActive
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
            <span className="truncate">{link.label}</span>
            {/* 採購管理數量氣泡 - 重新設計 */}
            {link.href === '/dashboard/purchase-orders' && !isLoading && cartItemCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold border-2 border-white shadow-lg z-10">
                <span className="animate-pulse">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              </div>
            )}
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
        <div className="flex h-16 shrink-0 items-center border-b px-6 bg-gradient-to-r from-purple-600 to-blue-600">
            <Image 
              src="/dexter-lab-logo.svg" 
              alt="德科斯特的實驗室" 
              width={24} 
              height={24} 
              className="text-white"
            />
            <span className="ml-2 font-semibold text-white text-sm">德科斯特的實驗室</span>
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
            <Image 
              src="/dexter-lab-logo.svg" 
              alt="德科斯特的實驗室" 
              width={24} 
              height={24} 
            />
            <span className="font-semibold text-gray-900 text-sm">德科斯特的實驗室</span>
          </div>
        </header>

                 {/* 移動版側邊欄 */}
         <aside className="lg:hidden fixed inset-y-0 left-0 z-20 h-full w-64 flex-col border-r bg-white shadow-xl transform -translate-x-full transition-transform duration-300 flex" id="mobile-sidebar">
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-gradient-to-r from-purple-600 to-blue-600">
            <div className="flex items-center">
              <Image 
                src="/dexter-lab-logo.svg" 
                alt="德科斯特的實驗室" 
                width={24} 
                height={24} 
                className="text-white"
              />
              <span className="ml-2 font-semibold text-white text-sm">德科斯特的實驗室</span>
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
