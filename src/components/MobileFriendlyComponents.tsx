// src/components/MobileFriendlyComponents.tsx
/**
 * 🎯 行動裝置友善組件
 *
 * 建立時間：2025-09-19
 * 目的：提供針對行動裝置優化的 UI 組件，包括大按鈕、觸控回饋、手勢支援
 */

import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { MOBILE_OPTIMIZATION } from '@/hooks/useMobileCacheStrategy';
import { Check, X, MoreHorizontal, ChevronRight } from 'lucide-react';

// =============================================================================
// 類型定義
// =============================================================================

export interface MobileTouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  hapticFeedback?: boolean; // 觸覺回饋
}

export interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: ReactNode; label: string; color: string };
  rightAction?: { icon: ReactNode; label: string; color: string };
  className?: string;
}

export interface MobileDataRowProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  value?: string | number;
  badge?: { text: string; variant: string };
  actions?: Array<{
    icon: ReactNode;
    label: string;
    onClick: () => void;
    variant?: string;
  }>;
  onClick?: () => void;
  className?: string;
}

export interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  color?: 'blue' | 'green' | 'red' | 'purple';
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// 行動裝置觸控按鈕
// =============================================================================

export function MobileTouchButton({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  className = '',
  hapticFeedback = true
}: MobileTouchButtonProps) {
  const { isMobile } = useDeviceDetection();

  const handleClick = () => {
    if (disabled || loading) return;

    // 觸覺回饋（如果支援）
    if (hapticFeedback && isMobile && 'vibrate' in navigator) {
      navigator.vibrate(10); // 短促振動
    }

    onClick?.();
  };

  // 行動裝置使用較大的按鈕
  const mobileSize = isMobile ? (size === 'sm' ? 'default' : 'lg') : size;

  const buttonClasses = cn(
    // 基礎樣式
    'relative overflow-hidden transition-all duration-200',

    // 行動裝置觸控優化
    isMobile && [
      'min-h-[44px]', // Apple HIG 建議最小觸控區域
      'px-6 py-3',
      'text-base font-medium',
      'active:scale-95', // 按下效果
      'touch-manipulation', // 優化觸控回應
    ],

    // 觸控回饋效果
    !disabled && [
      'active:bg-opacity-90',
      'active:shadow-inner',
    ],

    className
  );

  return (
    <Button
      variant={variant}
      size={mobileSize}
      disabled={disabled}
      onClick={handleClick}
      className={buttonClasses}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          載入中...
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

// =============================================================================
// 可滑動卡片
// =============================================================================

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className = ''
}: SwipeableCardProps) {
  const { isMobile } = useDeviceDetection();
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;

    const touch = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaX = touch.clientX - rect.left - rect.width / 2;
    setDragX(Math.max(-120, Math.min(120, deltaX))); // 限制滑動範圍
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isMobile) return;

    // 判斷滑動方向並執行對應動作
    if (dragX < -60 && onSwipeLeft) {
      onSwipeLeft();
    } else if (dragX > 60 && onSwipeRight) {
      onSwipeRight();
    }

    setDragX(0);
    setIsDragging(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 左側動作 */}
      {leftAction && (
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-24 flex items-center justify-center transition-opacity",
            leftAction.color,
            dragX > 20 ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="text-white text-center">
            {leftAction.icon}
            <div className="text-xs mt-1">{leftAction.label}</div>
          </div>
        </div>
      )}

      {/* 右側動作 */}
      {rightAction && (
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-24 flex items-center justify-center transition-opacity",
            rightAction.color,
            dragX < -20 ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="text-white text-center">
            {rightAction.icon}
            <div className="text-xs mt-1">{rightAction.label}</div>
          </div>
        </div>
      )}

      {/* 主卡片 */}
      <Card
        ref={cardRef}
        className={cn(
          'transition-transform duration-200',
          isDragging && 'shadow-lg',
          className
        )}
        style={{
          transform: isMobile ? `translateX(${dragX}px)` : undefined
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </Card>
    </div>
  );
}

// =============================================================================
// 行動裝置資料列
// =============================================================================

export function MobileDataRow({
  icon,
  title,
  subtitle,
  value,
  badge,
  actions = [],
  onClick,
  className = ''
}: MobileDataRowProps) {
  const { isMobile } = useDeviceDetection();
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 border-b border-gray-100',
      onClick && 'cursor-pointer hover:bg-gray-50',
      isMobile && 'min-h-[60px]', // 確保觸控區域足夠大
      className
    )}>
      {/* 圖示 */}
      {icon && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}

      {/* 主要內容 */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 truncate">{title}</h3>

          {value && (
            <span className="text-lg font-semibold text-gray-900 ml-2">
              {value}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-sm text-gray-500 truncate mt-1">{subtitle}</p>
        )}

        {badge && (
          <Badge variant={badge.variant as any} className="mt-2">
            {badge.text}
          </Badge>
        )}
      </div>

      {/* 動作按鈕 */}
      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {isMobile ? (
            // 行動裝置：顯示更多按鈕
            <MobileTouchButton
              variant="outline"
              size="sm"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </MobileTouchButton>
          ) : (
            // 桌面版：顯示所有動作
            actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant as any || 'ghost'}
                size="sm"
                onClick={action.onClick}
                title={action.label}
              >
                {action.icon}
              </Button>
            ))
          )}
        </div>
      )}

      {/* 點擊指示器 */}
      {onClick && (
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}

      {/* 行動裝置動作選單 */}
      {isMobile && showActions && (
        <div className="absolute right-4 top-full mt-2 bg-white rounded-lg shadow-lg border z-50 min-w-[120px]">
          {actions.map((action, index) => (
            <button
              key={index}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              onClick={() => {
                action.onClick();
                setShowActions(false);
              }}
            >
              {action.icon}
              <span className="text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 浮動操作按鈕
// =============================================================================

export function FloatingActionButton({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  color = 'blue',
  disabled = false,
  className = ''
}: FloatingActionButtonProps) {
  const { isMobile } = useDeviceDetection();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2'
  };

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'fixed z-50 rounded-full text-white shadow-lg transition-all duration-200',
        'flex items-center justify-center',
        'active:scale-95',

        // 大小調整
        isMobile ? 'w-14 h-14' : 'w-12 h-12',

        // 位置
        positionClasses[position],

        // 顏色
        colorClasses[color],

        // 狀態
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl',

        className
      )}
      title={label}
    >
      {icon}

      {/* 標籤 (僅行動裝置顯示) */}
      {label && isMobile && (
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs bg-gray-900 text-white px-2 py-1 rounded whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// 行動裝置載入骨架
// =============================================================================

export function MobileLoadingSkeleton({
  rows = 3,
  showAvatar = true,
  className = ''
}: {
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-4 border-b border-gray-100">
          {showAvatar && (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          )}

          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>

          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}