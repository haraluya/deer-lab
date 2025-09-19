// src/hooks/useMobilePerformanceMonitor.ts
/**
 * 📊 行動裝置效能監控 Hook
 *
 * 建立時間：2025-09-19
 * 目的：監控和分析行動裝置效能指標，提供優化建議
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

// =============================================================================
// 類型定義
// =============================================================================

export interface PerformanceMetrics {
  // 載入時間指標
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;

  // 快取效能指標
  cacheHitRate: number;
  cacheResponseTime: number;
  apiResponseTime: number;

  // 網路指標
  networkLatency: number;
  bandwidth: number;
  dataUsage: number;

  // 裝置效能指標
  memoryUsage: number;
  batteryLevel?: number;
  batteryCharging?: boolean;

  // 用戶體驗指標
  timeToInteractive: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  metric: keyof PerformanceMetrics;
  message: string;
  threshold: number;
  currentValue: number;
  recommendation: string;
  timestamp: number;
}

export interface PerformanceTrend {
  metric: keyof PerformanceMetrics;
  values: Array<{ timestamp: number; value: number }>;
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
}

export interface UseMobilePerformanceMonitorReturn {
  // 即時指標
  metrics: PerformanceMetrics | null;
  alerts: PerformanceAlert[];
  trends: PerformanceTrend[];

  // 監控控制
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // 資料記錄
  recordEvent: (eventType: string, duration?: number, metadata?: any) => void;
  recordCacheHit: (cacheKey: string, responseTime: number) => void;
  recordApiCall: (endpoint: string, responseTime: number, success: boolean) => void;

  // 分析報告
  getPerformanceReport: () => PerformanceReport;
  exportMetrics: () => string;

  // 優化建議
  getOptimizationSuggestions: () => OptimizationSuggestion[];
}

export interface PerformanceReport {
  summary: {
    overallScore: number;
    loadingPerformance: number;
    cacheEfficiency: number;
    userExperience: number;
  };
  breakdown: {
    strengths: string[];
    weaknesses: string[];
    criticalIssues: string[];
  };
  recommendations: OptimizationSuggestion[];
  deviceDetection: any;
  timestamp: number;
}

export interface OptimizationSuggestion {
  priority: 'high' | 'medium' | 'low';
  category: 'loading' | 'caching' | 'network' | 'ui' | 'battery';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: string;
}

// =============================================================================
// 效能閾值配置
// =============================================================================

const PERFORMANCE_THRESHOLDS = {
  // 載入時間 (毫秒)
  pageLoadTime: { good: 2000, warning: 5000, critical: 10000 },
  firstContentfulPaint: { good: 1500, warning: 3000, critical: 5000 },
  largestContentfulPaint: { good: 2500, warning: 4000, critical: 6000 },
  timeToInteractive: { good: 3000, warning: 5000, critical: 8000 },

  // 快取指標 (百分比 / 毫秒)
  cacheHitRate: { good: 80, warning: 60, critical: 40 },
  cacheResponseTime: { good: 50, warning: 200, critical: 500 },
  apiResponseTime: { good: 1000, warning: 3000, critical: 5000 },

  // 網路指標
  networkLatency: { good: 100, warning: 500, critical: 1000 },
  dataUsage: { good: 1024 * 1024, warning: 5 * 1024 * 1024, critical: 10 * 1024 * 1024 }, // bytes

  // 用戶體驗指標
  firstInputDelay: { good: 100, warning: 300, critical: 500 },
  cumulativeLayoutShift: { good: 0.1, warning: 0.25, critical: 0.5 },

  // 記憶體使用 (MB)
  memoryUsage: { good: 50, warning: 100, critical: 200 },
} as const;

// =============================================================================
// 效能資料儲存
// =============================================================================

class PerformanceStorage {
  private storageKey = 'mobile_performance_data';
  private maxRecords = 1000;

  saveMetrics(metrics: PerformanceMetrics): void {
    try {
      const stored = this.getStoredData();
      stored.push({
        ...metrics,
        timestamp: Date.now()
      });

      // 保持最新的 N 筆記錄
      if (stored.length > this.maxRecords) {
        stored.splice(0, stored.length - this.maxRecords);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('效能資料儲存失敗:', error);
    }
  }

  getStoredData(): Array<PerformanceMetrics & { timestamp: number }> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('效能資料讀取失敗:', error);
      return [];
    }
  }

  clearData(): void {
    localStorage.removeItem(this.storageKey);
  }

  getDataSince(since: number): Array<PerformanceMetrics & { timestamp: number }> {
    return this.getStoredData().filter(record => record.timestamp >= since);
  }
}

const performanceStorage = new PerformanceStorage();

// =============================================================================
// Hook 實現
// =============================================================================

export function useMobilePerformanceMonitor(): UseMobilePerformanceMonitorReturn {
  const deviceDetection = useDeviceDetection();
  const { isMobile, isSlowConnection } = deviceDetection;

  // 狀態管理
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // 計數器和參考
  const metricsRef = useRef<PerformanceMetrics | null>(null);
  const alertIdRef = useRef(0);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 快取和API統計
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    totalResponseTime: 0,
    hitCount: 0
  });

  const [apiStats, setApiStats] = useState({
    calls: 0,
    totalResponseTime: 0,
    successCount: 0,
    errorCount: 0
  });

  // =============================================================================
  // 效能指標收集
  // =============================================================================

  const collectPerformanceMetrics = useCallback((): PerformanceMetrics | null => {
    if (typeof window === 'undefined') return null;

    try {
      const navigation = performance.timing;
      const paintEntries = performance.getEntriesByType('paint');
      const memory = (performance as any).memory;

      // 計算載入時間
      const pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
      const domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.navigationStart;

      // First Contentful Paint
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      const firstContentfulPaint = fcpEntry ? fcpEntry.startTime : 0;

      // Largest Contentful Paint (需要 PerformanceObserver)
      let largestContentfulPaint = 0;
      try {
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
        }
      } catch (error) {
        // LCP 不支援時忽略
      }

      // 快取效能指標
      const cacheHitRate = cacheStats.hits + cacheStats.misses > 0
        ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
        : 0;

      const cacheResponseTime = cacheStats.hitCount > 0
        ? cacheStats.totalResponseTime / cacheStats.hitCount
        : 0;

      const apiResponseTime = apiStats.calls > 0
        ? apiStats.totalResponseTime / apiStats.calls
        : 0;

      // 記憶體使用
      const memoryUsage = memory
        ? Math.round(memory.usedJSHeapSize / (1024 * 1024))
        : 0;

      // 電池資訊 (如果支援)
      let batteryLevel: number | undefined;
      let batteryCharging: boolean | undefined;

      if ('getBattery' in navigator) {
        // 電池 API 是異步的，這裡只能提供上次的值
      }

      return {
        pageLoadTime,
        domContentLoadedTime,
        firstContentfulPaint,
        largestContentfulPaint,
        cacheHitRate,
        cacheResponseTime,
        apiResponseTime,
        networkLatency: 0, // 需要專門的測試
        bandwidth: 0, // 需要專門的測試
        dataUsage: 0, // 需要追蹤
        memoryUsage,
        batteryLevel,
        batteryCharging,
        timeToInteractive: 0, // 複雜計算
        cumulativeLayoutShift: 0, // 需要 PerformanceObserver
        firstInputDelay: 0, // 需要 PerformanceObserver
      };

    } catch (error) {
      console.error('效能指標收集失敗:', error);
      return null;
    }
  }, [cacheStats, apiStats]);

  // =============================================================================
  // 警告生成
  // =============================================================================

  const generateAlerts = useCallback((newMetrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    Object.entries(PERFORMANCE_THRESHOLDS).forEach(([metric, thresholds]) => {
      const value = newMetrics[metric as keyof PerformanceMetrics] as number;
      if (typeof value !== 'number' || value === 0) return;

      let alertType: 'warning' | 'error' | 'info' = 'info';
      let message = '';
      let recommendation = '';

      if (value >= thresholds.critical) {
        alertType = 'error';
        message = `${metric} 效能嚴重不佳`;
        recommendation = '需要立即優化';
      } else if (value >= thresholds.warning) {
        alertType = 'warning';
        message = `${metric} 效能需要改善`;
        recommendation = '建議進行優化';
      }

      if (alertType !== 'info') {
        newAlerts.push({
          id: `alert_${alertIdRef.current++}`,
          type: alertType,
          metric: metric as keyof PerformanceMetrics,
          message,
          threshold: alertType === 'error' ? thresholds.critical : thresholds.warning,
          currentValue: value,
          recommendation,
          timestamp: Date.now()
        });
      }
    });

    setAlerts(prevAlerts => {
      // 保持最新的 10 個警告
      const combined = [...newAlerts, ...prevAlerts].slice(0, 10);
      return combined;
    });
  }, []);

  // =============================================================================
  // 趨勢分析
  // =============================================================================

  const calculateTrends = useCallback(() => {
    const recentData = performanceStorage.getDataSince(Date.now() - 24 * 60 * 60 * 1000); // 24小時
    if (recentData.length < 2) return;

    const newTrends: PerformanceTrend[] = [];

    Object.keys(PERFORMANCE_THRESHOLDS).forEach(metric => {
      const metricKey = metric as keyof PerformanceMetrics;
      const values = recentData
        .map(record => ({
          timestamp: record.timestamp,
          value: record[metricKey] as number
        }))
        .filter(item => typeof item.value === 'number' && item.value > 0);

      if (values.length < 2) return;

      // 計算趨勢
      const firstValue = values[0].value;
      const lastValue = values[values.length - 1].value;
      const changePercent = ((lastValue - firstValue) / firstValue) * 100;

      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 5) {
        // 對於時間類指標，減少是改善；對於命中率類指標，增加是改善
        const isTimeMetric = metric.includes('Time') || metric.includes('Delay');
        if (isTimeMetric) {
          trend = changePercent < 0 ? 'improving' : 'degrading';
        } else {
          trend = changePercent > 0 ? 'improving' : 'degrading';
        }
      }

      newTrends.push({
        metric: metricKey,
        values: values.slice(-20), // 保持最新 20 個值
        trend,
        changePercent: Math.abs(changePercent)
      });
    });

    setTrends(newTrends);
  }, []);

  // =============================================================================
  // 監控控制
  // =============================================================================

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    console.log('📊 開始行動裝置效能監控');

    // 收集初始指標
    const initialMetrics = collectPerformanceMetrics();
    if (initialMetrics) {
      setMetrics(initialMetrics);
      metricsRef.current = initialMetrics;
      performanceStorage.saveMetrics(initialMetrics);
      generateAlerts(initialMetrics);
    }

    // 設定定期收集
    monitoringIntervalRef.current = setInterval(() => {
      const newMetrics = collectPerformanceMetrics();
      if (newMetrics) {
        setMetrics(newMetrics);
        metricsRef.current = newMetrics;
        performanceStorage.saveMetrics(newMetrics);
        generateAlerts(newMetrics);
      }
    }, isMobile ? 10000 : 5000); // 行動裝置降低頻率

    // 計算趨勢
    calculateTrends();
  }, [isMonitoring, collectPerformanceMetrics, generateAlerts, calculateTrends, isMobile]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    console.log('📊 停止行動裝置效能監控');

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, [isMonitoring]);

  // =============================================================================
  // 事件記錄
  // =============================================================================

  const recordEvent = useCallback((eventType: string, duration?: number, metadata?: any) => {
    console.log(`📝 記錄效能事件: ${eventType}`, { duration, metadata, timestamp: Date.now() });
  }, []);

  const recordCacheHit = useCallback((cacheKey: string, responseTime: number) => {
    setCacheStats(prev => ({
      ...prev,
      hits: prev.hits + 1,
      totalResponseTime: prev.totalResponseTime + responseTime,
      hitCount: prev.hitCount + 1
    }));

    recordEvent('cache_hit', responseTime, { cacheKey });
  }, [recordEvent]);

  const recordApiCall = useCallback((endpoint: string, responseTime: number, success: boolean) => {
    setApiStats(prev => ({
      ...prev,
      calls: prev.calls + 1,
      totalResponseTime: prev.totalResponseTime + responseTime,
      successCount: prev.successCount + (success ? 1 : 0),
      errorCount: prev.errorCount + (success ? 0 : 1)
    }));

    recordEvent('api_call', responseTime, { endpoint, success });
  }, [recordEvent]);

  // =============================================================================
  // 分析報告
  // =============================================================================

  const getPerformanceReport = useCallback((): PerformanceReport => {
    const currentMetrics = metricsRef.current;
    if (!currentMetrics) {
      return {
        summary: { overallScore: 0, loadingPerformance: 0, cacheEfficiency: 0, userExperience: 0 },
        breakdown: { strengths: [], weaknesses: [], criticalIssues: [] },
        recommendations: [],
        deviceDetection,
        timestamp: Date.now()
      };
    }

    // 計算各項評分 (0-100)
    const loadingScore = Math.max(0, 100 - (currentMetrics.pageLoadTime / 100));
    const cacheScore = currentMetrics.cacheHitRate;
    const uxScore = 100; // 簡化計算

    const overallScore = Math.round((loadingScore + cacheScore + uxScore) / 3);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const criticalIssues: string[] = [];

    // 分析優劣
    if (currentMetrics.cacheHitRate > 80) strengths.push('快取命中率優秀');
    else if (currentMetrics.cacheHitRate < 50) criticalIssues.push('快取命中率過低');
    else weaknesses.push('快取效率有改善空間');

    if (currentMetrics.pageLoadTime < 3000) strengths.push('頁面載入速度良好');
    else if (currentMetrics.pageLoadTime > 8000) criticalIssues.push('頁面載入過慢');
    else weaknesses.push('頁面載入速度需要優化');

    return {
      summary: {
        overallScore,
        loadingPerformance: Math.round(loadingScore),
        cacheEfficiency: Math.round(cacheScore),
        userExperience: Math.round(uxScore)
      },
      breakdown: {
        strengths,
        weaknesses,
        criticalIssues
      },
      recommendations: getOptimizationSuggestions(),
      deviceDetection,
      timestamp: Date.now()
    };
  }, [deviceDetection]);

  const getOptimizationSuggestions = useCallback((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const currentMetrics = metricsRef.current;

    if (!currentMetrics) return suggestions;

    // 快取優化建議
    if (currentMetrics.cacheHitRate < 70) {
      suggestions.push({
        priority: 'high',
        category: 'caching',
        title: '提升快取命中率',
        description: `當前快取命中率只有 ${Math.round(currentMetrics.cacheHitRate)}%`,
        impact: '大幅減少 API 調用次數和載入時間',
        implementation: '延長快取時間、預載關鍵資料、改善快取失效策略',
        estimatedImprovement: '載入時間可減少 40-60%'
      });
    }

    // 載入時間優化
    if (currentMetrics.pageLoadTime > 5000) {
      suggestions.push({
        priority: 'high',
        category: 'loading',
        title: '優化頁面載入時間',
        description: `頁面載入時間 ${Math.round(currentMetrics.pageLoadTime)}ms 過長`,
        impact: '顯著改善用戶體驗和留存率',
        implementation: '啟用欄位過濾、分頁載入、壓縮資料傳輸',
        estimatedImprovement: '載入時間可減少 50-70%'
      });
    }

    // 行動裝置專用建議
    if (isMobile) {
      if (currentMetrics.memoryUsage > 100) {
        suggestions.push({
          priority: 'medium',
          category: 'ui',
          title: '優化記憶體使用',
          description: `記憶體使用量 ${currentMetrics.memoryUsage}MB 偏高`,
          impact: '改善應用穩定性和反應速度',
          implementation: '清理未使用的快取、優化圖片載入、減少DOM節點',
          estimatedImprovement: '記憶體使用可減少 30-50%'
        });
      }

      if (isSlowConnection) {
        suggestions.push({
          priority: 'high',
          category: 'network',
          title: '慢速連線優化',
          description: '偵測到慢速網路連線',
          impact: '確保在弱網環境下仍能正常使用',
          implementation: '啟用資料壓縮、離線快取、降低資料傳輸量',
          estimatedImprovement: '慢速網路下載入時間可減少 60%'
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [isMobile, isSlowConnection]);

  const exportMetrics = useCallback((): string => {
    const data = {
      currentMetrics: metrics,
      historicalData: performanceStorage.getStoredData(),
      alerts: alerts,
      trends: trends,
      deviceDetection: deviceDetection,
      exportTime: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }, [metrics, alerts, trends, deviceDetection]);

  // =============================================================================
  // 自動啟動監控 (開發環境)
  // =============================================================================

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isMobile) {
      // 行動裝置在開發環境自動啟動監控
      setTimeout(() => startMonitoring(), 1000);
    }

    return () => {
      stopMonitoring();
    };
  }, [isMobile, startMonitoring, stopMonitoring]);

  // =============================================================================
  // 清理
  // =============================================================================

  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  // =============================================================================
  // 返回介面
  // =============================================================================

  return {
    // 即時指標
    metrics,
    alerts,
    trends,

    // 監控控制
    isMonitoring,
    startMonitoring,
    stopMonitoring,

    // 資料記錄
    recordEvent,
    recordCacheHit,
    recordApiCall,

    // 分析報告
    getPerformanceReport,
    exportMetrics,
    getOptimizationSuggestions,
  };
}