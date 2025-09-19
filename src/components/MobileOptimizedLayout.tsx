// src/components/MobileOptimizedLayout.tsx
/**
 * 🎯 行動裝置優化佈局組件
 *
 * 建立時間：2025-09-19
 * 目的：提供針對行動裝置優化的佈局方案，包括響應式設計、底部導航、滑動操作
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  Filter,
  Search,
  Plus,
  Menu,
  X
} from 'lucide-react';

// =============================================================================
// 類型定義
// =============================================================================

export interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  headerActions?: ReactNode;
  className?: string;
}

export interface MobileCardLayoutProps {
  data: any[];
  loading?: boolean;
  renderCard: (item: any, index: number) => ReactNode;
  emptyMessage?: string;
  loadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export interface MobileListViewProps {
  data: any[];
  loading?: boolean;
  renderItem: (item: any, index: number) => ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyMessage?: string;
  className?: string;
}

export interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilter?: () => void;
  onAdd?: () => void;
  placeholder?: string;
  filterCount?: number;
  className?: string;
}

export interface MobileTabsProps {
  tabs: Array<{
    key: string;
    label: string;
    count?: number;
    icon?: ReactNode;
  }>;
  activeTab: string;
  onChange: (tab: string) => void;
  className?: string;
}

// =============================================================================
// 主要佈局組件
// =============================================================================

export function MobileOptimizedLayout({
  children,
  title,
  showHeader = true,
  showBottomNav = false,
  headerActions,
  className = ''
}: MobileLayoutProps) {
  const { isMobile, screenWidth, performanceConfig } = useDeviceDetection();

  return (
    <div className={cn(
      'min-h-screen bg-gray-50',
      isMobile && 'pb-safe', // iOS safe area
      className
    )}>
      {/* 行動裝置標題列 */}
      {showHeader && isMobile && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {title || '德科斯特實驗室'}
            </h1>
            {headerActions && (
              <div className="flex items-center gap-2">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主要內容 */}
      <div className={cn(
        'flex-1',
        isMobile ? 'px-0' : 'px-6 py-6'
      )}>
        {children}
      </div>

      {/* 底部導航 (可選) */}
      {showBottomNav && isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-bottom">
          <div className="flex items-center justify-around">
            {/* 底部導航內容將由父組件提供 */}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 行動裝置搜尋列
// =============================================================================

export function MobileSearchBar({
  value,
  onChange,
  onFilter,
  onAdd,
  placeholder = "搜尋...",
  filterCount = 0,
  className = ''
}: MobileSearchBarProps) {
  const { isMobile } = useDeviceDetection();

  return (
    <div className={cn(
      'flex items-center gap-3',
      isMobile ? 'px-4 py-3 bg-white border-b border-gray-200' : 'mb-6',
      className
    )}>
      {/* 搜尋框 */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            isMobile && 'text-16px' // 避免 iOS 縮放
          )}
        />
      </div>

      {/* 篩選按鈕 */}
      {onFilter && (
        <Button
          variant="outline"
          size={isMobile ? "default" : "sm"}
          onClick={onFilter}
          className={cn(
            'relative',
            isMobile && 'min-w-[44px] min-h-[44px]'
          )}
        >
          <Filter className="h-4 w-4" />
          {filterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {filterCount}
            </Badge>
          )}
        </Button>
      )}

      {/* 新增按鈕 */}
      {onAdd && (
        <Button
          size={isMobile ? "default" : "sm"}
          onClick={onAdd}
          className={cn(
            isMobile && 'min-w-[44px] min-h-[44px]'
          )}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// 行動裝置分頁標籤
// =============================================================================

export function MobileTabs({
  tabs,
  activeTab,
  onChange,
  className = ''
}: MobileTabsProps) {
  const { isMobile } = useDeviceDetection();

  return (
    <div className={cn(
      'flex bg-white border-b border-gray-200',
      isMobile && 'overflow-x-auto scrollbar-hide',
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition-colors',
            isMobile && 'min-w-[80px] flex-shrink-0',
            activeTab === tab.key
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          {tab.icon}
          <span className="font-medium">{tab.label}</span>
          {tab.count !== undefined && (
            <Badge variant="secondary" className="ml-1">
              {tab.count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// 行動裝置卡片佈局
// =============================================================================

export function MobileCardLayout({
  data,
  loading = false,
  renderCard,
  emptyMessage = "沒有資料",
  loadMore,
  hasMore = false,
  className = ''
}: MobileCardLayoutProps) {
  const { isMobile, performanceConfig } = useDeviceDetection();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 無限滾動載入更多
  useEffect(() => {
    if (!isMobile || !loadMore || !hasMore) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.offsetHeight;

      if (scrollTop + windowHeight >= docHeight - 1000 && !isLoadingMore) {
        setIsLoadingMore(true);
        try {
          loadMore();
        } finally {
          setIsLoadingMore(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, loadMore, hasMore, isLoadingMore]);

  if (loading && data.length === 0) {
    return (
      <div className={cn(
        'space-y-4',
        isMobile ? 'px-4' : '',
        className
      )}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <p className="text-gray-600 text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'space-y-4',
      isMobile ? 'px-4 pb-6' : '',
      className
    )}>
      {data.map((item, index) => renderCard(item, index))}

      {/* 載入更多指示器 */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            載入更多...
          </div>
        </div>
      )}

      {/* 載入更多按鈕 (非無限滾動時) */}
      {!isMobile && loadMore && hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => {
              setIsLoadingMore(true);
              try {
                loadMore();
              } finally {
                setIsLoadingMore(false);
              }
            }}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? '載入中...' : '載入更多'}
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 行動裝置清單視圖
// =============================================================================

export function MobileListView({
  data,
  loading = false,
  renderItem,
  onRefresh,
  refreshing = false,
  emptyMessage = "沒有資料",
  className = ''
}: MobileListViewProps) {
  const { isMobile } = useDeviceDetection();

  if (loading && data.length === 0) {
    return (
      <div className={className}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-4 border-b border-gray-100 animate-pulse">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <p className="text-gray-600 text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white',
      isMobile && 'min-h-screen',
      className
    )}>
      {/* 下拉刷新指示器 */}
      {refreshing && isMobile && (
        <div className="flex justify-center py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            刷新中...
          </div>
        </div>
      )}

      {/* 清單項目 */}
      <div className="divide-y divide-gray-100">
        {data.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
}

// =============================================================================
// 行動裝置統計卡片
// =============================================================================

export function MobileStatsGrid({
  stats,
  className = ''
}: {
  stats: Array<{
    title: string;
    value: string | number;
    icon?: ReactNode;
    color?: string;
    trend?: { value: number; label: string };
  }>;
  className?: string;
}) {
  const { isMobile } = useDeviceDetection();

  return (
    <div className={cn(
      'grid gap-4',
      isMobile ? 'grid-cols-2 px-4 py-4' : 'grid-cols-4',
      className
    )}>
      {stats.map((stat, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className={cn(
            'flex items-center justify-between',
            isMobile ? 'p-4' : 'p-6'
          )}>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-gray-600 font-medium',
                isMobile ? 'text-sm' : 'text-base'
              )}>
                {stat.title}
              </p>
              <p className={cn(
                'font-bold text-gray-900 mt-1',
                isMobile ? 'text-lg' : 'text-2xl'
              )}>
                {stat.value}
              </p>
              {stat.trend && (
                <p className="text-xs text-gray-500 mt-1">
                  {stat.trend.label}
                </p>
              )}
            </div>
            {stat.icon && (
              <div className={cn(
                'flex-shrink-0 ml-2',
                isMobile ? 'text-lg' : 'text-xl',
                stat.color || 'text-gray-400'
              )}>
                {stat.icon}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}