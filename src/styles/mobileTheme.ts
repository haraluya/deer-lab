// src/styles/mobileTheme.ts
/**
 * 🎨 行動裝置統一主題配置
 *
 * 建立時間：2025-09-19
 * 目的：提供統一的行動裝置主題和樣式配置，確保一致性和可維護性
 */

import { useDeviceDetection } from '@/hooks/useDeviceDetection';

// =============================================================================
// 類型定義
// =============================================================================

export interface MobileThemeConfig {
  // 基礎尺寸
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  // 觸控友善尺寸
  touchTarget: {
    minSize: string;
    comfortable: string;
    large: string;
  };

  // 字體大小
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
  };

  // 圓角設計
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };

  // 陰影層級
  boxShadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    floating: string;
  };

  // 動畫時間
  animation: {
    fast: string;
    normal: string;
    slow: string;
  };

  // Z-index 層級
  zIndex: {
    dropdown: number;
    sticky: number;
    fixed: number;
    modal: number;
    popover: number;
    tooltip: number;
  };

  // 行動裝置專用樣式
  mobile: {
    safeArea: {
      top: string;
      bottom: string;
    };
    scrollbar: {
      width: string;
      trackColor: string;
      thumbColor: string;
    };
    haptic: {
      enabled: boolean;
      lightIntensity: number;
      mediumIntensity: number;
    };
  };
}

export interface ColorPalette {
  // 主要顏色
  primary: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
    900: string;
  };

  // 功能顏色
  success: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };

  warning: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };

  error: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };

  // 灰度顏色
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

// =============================================================================
// 主題配置
// =============================================================================

export const mobileThemeConfig: MobileThemeConfig = {
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
  },

  touchTarget: {
    minSize: '44px',      // Apple HIG 最小建議
    comfortable: '48px',   // 舒適點擊區域
    large: '56px',        // 大按鈕
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',    // 避免 iOS Safari 縮放
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    floating: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
  },

  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  zIndex: {
    dropdown: 1000,
    sticky: 1010,
    fixed: 1020,
    modal: 1030,
    popover: 1040,
    tooltip: 1050,
  },

  mobile: {
    safeArea: {
      top: 'env(safe-area-inset-top)',
      bottom: 'env(safe-area-inset-bottom)',
    },
    scrollbar: {
      width: '6px',
      trackColor: 'transparent',
      thumbColor: 'rgba(0, 0, 0, 0.2)',
    },
    haptic: {
      enabled: true,
      lightIntensity: 10,
      mediumIntensity: 25,
    },
  },
};

export const colorPalette: ColorPalette = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },

  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  warning: {
    50: '#fefce8',
    100: '#fef3c7',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// =============================================================================
// 主題 Hook
// =============================================================================

export function useMobileTheme() {
  const { isMobile, isTablet, performanceConfig } = useDeviceDetection();

  // 根據裝置類型調整主題
  const theme = {
    ...mobileThemeConfig,
    // 動態調整字體大小
    fontSize: {
      ...mobileThemeConfig.fontSize,
      base: isMobile ? '16px' : '14px', // 行動裝置使用較大字體
    },
    // 動態調整間距
    spacing: isMobile ? {
      ...mobileThemeConfig.spacing,
      md: '1.25rem', // 行動裝置增加間距
      lg: '2rem',
    } : mobileThemeConfig.spacing,
    // 動態調整觸控區域
    touchTarget: isMobile ? {
      minSize: '48px',      // 行動裝置使用更大的觸控區域
      comfortable: '52px',
      large: '60px',
    } : mobileThemeConfig.touchTarget,
  };

  const colors = colorPalette;

  // =============================================================================
  // 工具函數
  // =============================================================================

  /**
   * 產生響應式 className
   */
  const responsive = (base: string, mobile?: string, tablet?: string) => {
    let classes = base;
    if (mobile && isMobile) classes += ` ${mobile}`;
    if (tablet && isTablet) classes += ` ${tablet}`;
    return classes;
  };

  /**
   * 產生觸控友善的 className
   */
  const touchFriendly = (size: 'min' | 'comfortable' | 'large' = 'comfortable') => {
    const minHeight = theme.touchTarget[size === 'min' ? 'minSize' : size === 'large' ? 'large' : 'comfortable'];
    return isMobile ? `min-h-[${minHeight}] min-w-[${minHeight}]` : '';
  };

  /**
   * 產生 Safe Area 樣式
   */
  const safeArea = (position: 'top' | 'bottom' | 'both' = 'both') => {
    if (!isMobile) return '';

    const styles: string[] = [];
    if (position === 'top' || position === 'both') {
      styles.push(`pt-[${theme.mobile.safeArea.top}]`);
    }
    if (position === 'bottom' || position === 'both') {
      styles.push(`pb-[${theme.mobile.safeArea.bottom}]`);
    }
    return styles.join(' ');
  };

  /**
   * 產生適應性動畫時間
   */
  const animationDuration = (speed: 'fast' | 'normal' | 'slow' = 'normal') => {
    // 如果裝置效能較低，使用較快的動畫
    const isLowPerformance = performanceConfig.animationReduced;
    if (isLowPerformance && speed !== 'fast') {
      return theme.animation.fast;
    }
    return theme.animation[speed];
  };

  /**
   * 產生行動裝置專用樣式
   */
  const mobileOnly = (className: string) => {
    return isMobile ? className : '';
  };

  /**
   * 產生桌面裝置專用樣式
   */
  const desktopOnly = (className: string) => {
    return !isMobile ? className : '';
  };

  /**
   * 產生觸覺回饋
   */
  const hapticFeedback = (intensity: 'light' | 'medium' = 'light') => {
    if (!isMobile || !theme.mobile.haptic.enabled || !('vibrate' in navigator)) {
      return () => {}; // 空函數
    }

    return () => {
      const duration = intensity === 'light'
        ? theme.mobile.haptic.lightIntensity
        : theme.mobile.haptic.mediumIntensity;
      navigator.vibrate(duration);
    };
  };

  // =============================================================================
  // CSS 變數生成
  // =============================================================================

  const cssVariables = {
    // 顏色變數
    '--primary-50': colors.primary[50],
    '--primary-100': colors.primary[100],
    '--primary-500': colors.primary[500],
    '--primary-600': colors.primary[600],
    '--primary-700': colors.primary[700],
    '--primary-900': colors.primary[900],

    // 間距變數
    '--spacing-xs': theme.spacing.xs,
    '--spacing-sm': theme.spacing.sm,
    '--spacing-md': theme.spacing.md,
    '--spacing-lg': theme.spacing.lg,
    '--spacing-xl': theme.spacing.xl,

    // 觸控區域變數
    '--touch-min': theme.touchTarget.minSize,
    '--touch-comfortable': theme.touchTarget.comfortable,
    '--touch-large': theme.touchTarget.large,

    // 字體大小變數
    '--font-xs': theme.fontSize.xs,
    '--font-sm': theme.fontSize.sm,
    '--font-base': theme.fontSize.base,
    '--font-lg': theme.fontSize.lg,
    '--font-xl': theme.fontSize.xl,
    '--font-2xl': theme.fontSize['2xl'],

    // 動畫時間變數
    '--animation-fast': theme.animation.fast,
    '--animation-normal': theme.animation.normal,
    '--animation-slow': theme.animation.slow,

    // Safe Area 變數
    '--safe-area-top': theme.mobile.safeArea.top,
    '--safe-area-bottom': theme.mobile.safeArea.bottom,
  };

  return {
    theme,
    colors,
    responsive,
    touchFriendly,
    safeArea,
    animationDuration,
    mobileOnly,
    desktopOnly,
    hapticFeedback,
    cssVariables,
    isMobile,
    isTablet,
  };
}

// =============================================================================
// 預定義樣式類別
// =============================================================================

export const mobileClasses = {
  // 觸控友善按鈕
  touchButton: 'min-h-[44px] min-w-[44px] active:scale-95 transition-transform touch-manipulation',

  // 安全區域
  safeAreaTop: 'pt-safe-top',
  safeAreaBottom: 'pb-safe-bottom',

  // 滾動條樣式 (Webkit)
  hideScrollbar: 'scrollbar-hide [-webkit-scrollbar]:w-0 [-webkit-scrollbar]:bg-transparent',

  // 行動裝置卡片
  mobileCard: 'bg-white rounded-lg shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors',

  // 行動裝置清單項目
  mobileListItem: 'min-h-[60px] px-4 py-3 border-b border-gray-100 last:border-0 active:bg-gray-50',

  // 浮動操作按鈕
  fab: 'fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg active:scale-95 transition-transform',

  // 載入骨架
  skeleton: 'animate-pulse bg-gray-200 rounded',

  // 徽章
  mobileBadge: 'inline-flex items-center px-2 py-1 rounded text-xs font-medium',

  // 搜尋列
  mobileSearchBar: 'flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200',

  // 分頁標籤
  mobileTabs: 'flex bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide',

  // 模態框
  mobileModal: 'fixed inset-0 z-50 bg-white overflow-y-auto pt-safe-top pb-safe-bottom',

  // 底部面板
  bottomSheet: 'fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl pb-safe-bottom',

  // 下拉刷新
  pullToRefresh: 'transform transition-transform duration-200',
} as const;

// =============================================================================
// Tailwind CSS 自定義工具類別
// =============================================================================

export const tailwindMobileUtilities = `
  @layer utilities {
    .pt-safe-top {
      padding-top: env(safe-area-inset-top);
    }

    .pb-safe-bottom {
      padding-bottom: env(safe-area-inset-bottom);
    }

    .pt-safe {
      padding-top: env(safe-area-inset-top);
    }

    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom);
    }

    .touch-manipulation {
      touch-action: manipulation;
    }

    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }

    .text-16px {
      font-size: 16px; /* 避免 iOS Safari 縮放 */
    }

    .min-touch-target {
      min-width: 44px;
      min-height: 44px;
    }

    .comfortable-touch {
      min-width: 48px;
      min-height: 48px;
    }

    .large-touch {
      min-width: 56px;
      min-height: 56px;
    }
  }
`;