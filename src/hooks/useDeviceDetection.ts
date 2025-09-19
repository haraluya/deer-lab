// src/hooks/useDeviceDetection.ts
/**
 * 🔧 裝置檢測 Hook
 *
 * 建立時間：2025-09-19
 * 目的：檢測用戶裝置類型，為行動裝置提供優化策略
 */

import { useState, useEffect } from 'react';

// =============================================================================
// 類型定義
// =============================================================================

export interface DeviceInfo {
  // 裝置類型
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // 裝置特徵
  isTouchDevice: boolean;
  isSlowConnection: boolean;

  // 螢幕資訊
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;

  // 性能指標
  deviceMemory?: number; // GB (如果支援)
  hardwareConcurrency: number; // CPU 核心數

  // 網路狀況
  connectionType?: string;
  effectiveType?: string; // 有效網路類型
}

export interface DevicePerformanceConfig {
  // 快取策略
  cacheMultiplier: number; // 快取時間倍數 (行動裝置通常較長)
  preloadEnabled: boolean; // 是否啟用預載

  // 載入策略
  dataPageSize: number; // 分頁載入大小
  imageLoadingStrategy: 'eager' | 'lazy'; // 圖片載入策略

  // UI 策略
  animationReduced: boolean; // 是否減少動畫
  compactMode: boolean; // 是否使用緊湊模式
}

// =============================================================================
// Hook 實現
// =============================================================================

export function useDeviceDetection(): DeviceInfo & { performanceConfig: DevicePerformanceConfig } {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    isSlowConnection: false,
    screenWidth: 0,
    screenHeight: 0,
    pixelRatio: 1,
    hardwareConcurrency: 4,
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 檢測裝置類型
      const isMobile = screenWidth <= 768 || /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTablet = screenWidth > 768 && screenWidth <= 1024;
      const isDesktop = screenWidth > 1024;

      // 檢測觸控支援
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // 檢測網路狀況
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const isSlowConnection = connection ?
        (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : false;

      // 取得硬體資訊
      const deviceMemory = (navigator as any).deviceMemory;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const pixelRatio = window.devicePixelRatio || 1;

      const newDeviceInfo: DeviceInfo = {
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        isSlowConnection,
        screenWidth,
        screenHeight,
        pixelRatio,
        deviceMemory,
        hardwareConcurrency,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
      };

      setDeviceInfo(newDeviceInfo);
    };

    // 初始檢測
    detectDevice();

    // 監聽視窗大小變化
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);

    // 監聽網路變化
    const handleConnectionChange = () => {
      detectDevice();
    };

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  // 根據裝置資訊計算效能配置
  const performanceConfig: DevicePerformanceConfig = {
    // 行動裝置使用更長的快取時間
    cacheMultiplier: deviceInfo.isMobile ? 2.0 : 1.0,

    // 低效能裝置關閉預載
    preloadEnabled: !deviceInfo.isMobile || (deviceInfo.hardwareConcurrency >= 4 && !deviceInfo.isSlowConnection),

    // 行動裝置使用較小的分頁大小
    dataPageSize: deviceInfo.isMobile ? 20 : 50,

    // 行動裝置預設延遲載入圖片
    imageLoadingStrategy: deviceInfo.isMobile ? 'lazy' : 'eager',

    // 慢速連線或低效能裝置減少動畫
    animationReduced: deviceInfo.isSlowConnection || (deviceInfo.hardwareConcurrency < 4),

    // 小螢幕使用緊湊模式
    compactMode: deviceInfo.screenWidth <= 768,
  };

  return {
    ...deviceInfo,
    performanceConfig,
  };
}

// =============================================================================
// 工具函數
// =============================================================================

/**
 * 檢查是否為行動裝置
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;

  return screenWidth <= 768 || /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

/**
 * 檢查是否為慢速連線
 */
export function isSlowConnection(): boolean {
  if (typeof window === 'undefined') return false;

  const connection = (navigator as any).connection;
  if (!connection) return false;

  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

/**
 * 取得建議的快取時間 (毫秒)
 */
export function getOptimalCacheTime(baseTime: number): number {
  const device = isMobileDevice();
  const slowConnection = isSlowConnection();

  let multiplier = 1;

  // 行動裝置延長快取時間
  if (device) multiplier *= 1.5;

  // 慢速連線進一步延長
  if (slowConnection) multiplier *= 2;

  return Math.round(baseTime * multiplier);
}