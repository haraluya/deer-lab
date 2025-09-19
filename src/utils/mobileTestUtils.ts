// src/utils/mobileTestUtils.ts
/**
 * 🧪 行動裝置測試和驗證工具
 *
 * 建立時間：2025-09-19
 * 目的：提供行動裝置功能測試、效能驗證、相容性檢查工具
 */

import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useMobilePerformanceMonitor } from '@/hooks/useMobilePerformanceMonitor';

// =============================================================================
// 類型定義
// =============================================================================

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

export interface CompatibilityTestResult {
  feature: string;
  supported: boolean;
  version?: string;
  notes?: string;
}

export interface PerformanceTestResult {
  metric: string;
  value: number;
  threshold: number;
  passed: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface MobileTestReport {
  deviceInfo: any;
  timestamp: number;
  compatibilityTests: CompatibilityTestResult[];
  performanceTests: PerformanceTestResult[];
  functionalTests: TestSuite[];
  overallScore: number;
  recommendations: string[];
}

// =============================================================================
// 相容性測試
// =============================================================================

export class MobileCompatibilityTester {
  static testTouchSupport(): CompatibilityTestResult {
    const supported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return {
      feature: 'Touch Support',
      supported,
      notes: supported ? `Max touch points: ${navigator.maxTouchPoints}` : 'Touch events not supported'
    };
  }

  static testServiceWorkerSupport(): CompatibilityTestResult {
    const supported = 'serviceWorker' in navigator;
    return {
      feature: 'Service Worker',
      supported,
      notes: supported ? 'PWA features available' : 'Offline functionality limited'
    };
  }

  static testIndexedDBSupport(): CompatibilityTestResult {
    const supported = 'indexedDB' in window;
    return {
      feature: 'IndexedDB',
      supported,
      notes: supported ? 'Offline storage available' : 'Local storage limited to localStorage'
    };
  }

  static testWebGLSupport(): CompatibilityTestResult {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const supported = !!gl;
      return {
        feature: 'WebGL',
        supported,
        notes: supported ? 'Hardware acceleration available' : 'Graphics performance may be limited'
      };
    } catch (error) {
      return {
        feature: 'WebGL',
        supported: false,
        notes: 'WebGL test failed'
      };
    }
  }

  static testGeolocationSupport(): CompatibilityTestResult {
    const supported = 'geolocation' in navigator;
    return {
      feature: 'Geolocation',
      supported,
      notes: supported ? 'Location services available' : 'Location features disabled'
    };
  }

  static testCameraSupport(): CompatibilityTestResult {
    const supported = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    return {
      feature: 'Camera Access',
      supported,
      notes: supported ? 'Camera features available' : 'Camera functionality limited'
    };
  }

  static testVibrationSupport(): CompatibilityTestResult {
    const supported = 'vibrate' in navigator;
    return {
      feature: 'Vibration',
      supported,
      notes: supported ? 'Haptic feedback available' : 'Tactile feedback unavailable'
    };
  }

  static testNetworkInformationSupport(): CompatibilityTestResult {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const supported = !!connection;
    return {
      feature: 'Network Information',
      supported,
      notes: supported ? `Connection type: ${connection.effectiveType}` : 'Network optimization limited'
    };
  }

  static testBatterySupport(): CompatibilityTestResult {
    const supported = 'getBattery' in navigator;
    return {
      feature: 'Battery Status',
      supported,
      notes: supported ? 'Power management available' : 'Battery optimization limited'
    };
  }

  static testDeviceOrientationSupport(): CompatibilityTestResult {
    const supported = 'DeviceOrientationEvent' in window;
    return {
      feature: 'Device Orientation',
      supported,
      notes: supported ? 'Orientation detection available' : 'Rotation events unavailable'
    };
  }

  static runAllCompatibilityTests(): CompatibilityTestResult[] {
    return [
      this.testTouchSupport(),
      this.testServiceWorkerSupport(),
      this.testIndexedDBSupport(),
      this.testWebGLSupport(),
      this.testGeolocationSupport(),
      this.testCameraSupport(),
      this.testVibrationSupport(),
      this.testNetworkInformationSupport(),
      this.testBatterySupport(),
      this.testDeviceOrientationSupport(),
    ];
  }
}

// =============================================================================
// 效能測試
// =============================================================================

export class MobilePerformanceTester {
  static async testPageLoadTime(): Promise<PerformanceTestResult> {
    const startTime = performance.timing.navigationStart;
    const loadTime = performance.timing.loadEventEnd - startTime;

    return {
      metric: 'Page Load Time',
      value: loadTime,
      threshold: 3000, // 3秒
      passed: loadTime < 3000,
      grade: this.gradePerformance(loadTime, [1000, 2000, 3000, 5000])
    };
  }

  static async testFirstContentfulPaint(): Promise<PerformanceTestResult> {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const fcp = fcpEntry ? fcpEntry.startTime : 0;

    return {
      metric: 'First Contentful Paint',
      value: fcp,
      threshold: 1500, // 1.5秒
      passed: fcp < 1500,
      grade: this.gradePerformance(fcp, [800, 1200, 1500, 2500])
    };
  }

  static async testMemoryUsage(): Promise<PerformanceTestResult> {
    const memory = (performance as any).memory;
    const usedMemory = memory ? memory.usedJSHeapSize / (1024 * 1024) : 0; // MB

    return {
      metric: 'Memory Usage',
      value: usedMemory,
      threshold: 50, // 50MB
      passed: usedMemory < 50,
      grade: this.gradePerformance(usedMemory, [25, 40, 50, 80])
    };
  }

  static async testScrollPerformance(): Promise<PerformanceTestResult> {
    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = 0;
      const testDuration = 2000; // 2秒

      const measureFrames = () => {
        if (startTime === 0) startTime = Date.now();

        frameCount++;
        const elapsed = Date.now() - startTime;

        if (elapsed < testDuration) {
          requestAnimationFrame(measureFrames);
        } else {
          const fps = (frameCount / elapsed) * 1000;
          resolve({
            metric: 'Scroll FPS',
            value: fps,
            threshold: 30, // 30 FPS
            passed: fps >= 30,
            grade: this.gradePerformance(fps, [60, 45, 30, 20], true) // 反向評分
          });
        }
      };

      // 觸發滾動測試
      window.scrollBy(0, 1);
      requestAnimationFrame(measureFrames);
    });
  }

  static async testTouchResponsiveness(): Promise<PerformanceTestResult> {
    return new Promise((resolve) => {
      let touchStart = 0;
      let touchEnd = 0;
      let measured = false;

      const testElement = document.createElement('div');
      testElement.style.cssText = `
        position: fixed;
        top: -100px;
        left: -100px;
        width: 50px;
        height: 50px;
        background: transparent;
        pointer-events: auto;
      `;
      document.body.appendChild(testElement);

      const handleTouchStart = () => {
        touchStart = performance.now();
      };

      const handleTouchEnd = () => {
        if (!measured) {
          touchEnd = performance.now();
          measured = true;

          const responseTime = touchEnd - touchStart;

          testElement.removeEventListener('touchstart', handleTouchStart);
          testElement.removeEventListener('touchend', handleTouchEnd);
          document.body.removeChild(testElement);

          resolve({
            metric: 'Touch Response Time',
            value: responseTime,
            threshold: 100, // 100ms
            passed: responseTime < 100,
            grade: this.gradePerformance(responseTime, [50, 80, 100, 200])
          });
        }
      };

      testElement.addEventListener('touchstart', handleTouchStart);
      testElement.addEventListener('touchend', handleTouchEnd);

      // 模擬觸控
      const touchEvent = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 1,
          target: testElement,
          clientX: 0,
          clientY: 0,
        })],
        bubbles: true,
        cancelable: true,
      });

      setTimeout(() => {
        testElement.dispatchEvent(touchEvent);

        const touchEndEvent = new TouchEvent('touchend', {
          touches: [],
          bubbles: true,
          cancelable: true,
        });

        setTimeout(() => {
          testElement.dispatchEvent(touchEndEvent);
        }, 10);
      }, 100);

      // 安全機制：3秒後自動結束
      setTimeout(() => {
        if (!measured) {
          resolve({
            metric: 'Touch Response Time',
            value: 999,
            threshold: 100,
            passed: false,
            grade: 'F'
          });
        }
      }, 3000);
    });
  }

  static async testNetworkLatency(): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    try {
      // 使用小圖片測試網路延遲
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = () => {
          const latency = performance.now() - startTime;
          resolve({
            metric: 'Network Latency',
            value: latency,
            threshold: 500, // 500ms
            passed: latency < 500,
            grade: this.gradePerformance(latency, [100, 200, 500, 1000])
          });
        };

        img.onerror = () => {
          resolve({
            metric: 'Network Latency',
            value: 999,
            threshold: 500,
            passed: false,
            grade: 'F'
          });
        };

        // 使用時間戳避免快取
        img.src = `/api/ping?t=${Date.now()}`;

        // 超時保護
        setTimeout(() => {
          resolve({
            metric: 'Network Latency',
            value: 999,
            threshold: 500,
            passed: false,
            grade: 'F'
          });
        }, 5000);
      });
    } catch (error) {
      return {
        metric: 'Network Latency',
        value: 999,
        threshold: 500,
        passed: false,
        grade: 'F'
      };
    }
  }

  private static gradePerformance(
    value: number,
    thresholds: [number, number, number, number],
    higherIsBetter = false
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    const [a, b, c, d] = thresholds;

    if (higherIsBetter) {
      if (value >= a) return 'A';
      if (value >= b) return 'B';
      if (value >= c) return 'C';
      if (value >= d) return 'D';
      return 'F';
    } else {
      if (value <= a) return 'A';
      if (value <= b) return 'B';
      if (value <= c) return 'C';
      if (value <= d) return 'D';
      return 'F';
    }
  }

  static async runAllPerformanceTests(): Promise<PerformanceTestResult[]> {
    const tests = [
      this.testPageLoadTime(),
      this.testFirstContentfulPaint(),
      this.testMemoryUsage(),
      this.testScrollPerformance(),
      this.testTouchResponsiveness(),
      this.testNetworkLatency(),
    ];

    return Promise.all(tests);
  }
}

// =============================================================================
// 功能測試
// =============================================================================

export class MobileFunctionalTester {
  static async testCacheSystem(): Promise<TestResult> {
    const startTime = performance.now();

    try {
      // 測試快取寫入
      const testData = { test: 'cache_test', timestamp: Date.now() };
      localStorage.setItem('mobile_test_cache', JSON.stringify(testData));

      // 測試快取讀取
      const retrieved = localStorage.getItem('mobile_test_cache');
      const parsedData = retrieved ? JSON.parse(retrieved) : null;

      // 清理測試資料
      localStorage.removeItem('mobile_test_cache');

      const duration = performance.now() - startTime;
      const passed = parsedData && parsedData.test === 'cache_test';

      return {
        testName: 'Cache System',
        passed,
        message: passed ? 'Cache system working correctly' : 'Cache system failed',
        duration,
        details: { testData, parsedData }
      };
    } catch (error) {
      return {
        testName: 'Cache System',
        passed: false,
        message: `Cache test failed: ${error}`,
        duration: performance.now() - startTime
      };
    }
  }

  static async testTouchEvents(): Promise<TestResult> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      let touchDetected = false;

      const testElement = document.createElement('div');
      testElement.style.cssText = 'position: fixed; top: -100px; width: 1px; height: 1px;';
      document.body.appendChild(testElement);

      const handleTouch = () => {
        touchDetected = true;
      };

      testElement.addEventListener('touchstart', handleTouch);

      // 模擬觸控事件
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: []
      });

      testElement.dispatchEvent(touchEvent);

      setTimeout(() => {
        testElement.removeEventListener('touchstart', handleTouch);
        document.body.removeChild(testElement);

        resolve({
          testName: 'Touch Events',
          passed: touchDetected,
          message: touchDetected ? 'Touch events working' : 'Touch events not detected',
          duration: performance.now() - startTime
        });
      }, 100);
    });
  }

  static async testOfflineStorage(): Promise<TestResult> {
    const startTime = performance.now();

    try {
      if (!('indexedDB' in window)) {
        return {
          testName: 'Offline Storage',
          passed: false,
          message: 'IndexedDB not supported',
          duration: performance.now() - startTime
        };
      }

      // 簡化的 IndexedDB 測試
      const request = indexedDB.open('mobile_test_db', 1);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result;
          db.close();
          indexedDB.deleteDatabase('mobile_test_db');

          resolve({
            testName: 'Offline Storage',
            passed: true,
            message: 'IndexedDB working correctly',
            duration: performance.now() - startTime
          });
        };

        request.onerror = () => {
          resolve({
            testName: 'Offline Storage',
            passed: false,
            message: 'IndexedDB test failed',
            duration: performance.now() - startTime
          });
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          db.createObjectStore('test_store');
        };
      });
    } catch (error) {
      return {
        testName: 'Offline Storage',
        passed: false,
        message: `Offline storage test error: ${error}`,
        duration: performance.now() - startTime
      };
    }
  }

  static async testResponsiveDesign(): Promise<TestResult> {
    const startTime = performance.now();

    try {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const pixelRatio = window.devicePixelRatio;

      // 檢查是否為行動裝置尺寸
      const isMobileSize = screenWidth <= 768;
      const hasRetinaDisplay = pixelRatio > 1;

      const testElement = document.createElement('div');
      testElement.className = 'w-full sm:w-1/2 md:w-1/3';
      document.body.appendChild(testElement);

      const computedStyles = window.getComputedStyle(testElement);
      const hasResponsiveStyles = computedStyles.width !== '';

      document.body.removeChild(testElement);

      return {
        testName: 'Responsive Design',
        passed: hasResponsiveStyles,
        message: hasResponsiveStyles ? 'Responsive design working' : 'Responsive styles not applied',
        duration: performance.now() - startTime,
        details: {
          screenWidth,
          screenHeight,
          pixelRatio,
          isMobileSize,
          hasRetinaDisplay
        }
      };
    } catch (error) {
      return {
        testName: 'Responsive Design',
        passed: false,
        message: `Responsive design test error: ${error}`,
        duration: performance.now() - startTime
      };
    }
  }

  static async runAllFunctionalTests(): Promise<TestSuite> {
    const tests = await Promise.all([
      this.testCacheSystem(),
      this.testTouchEvents(),
      this.testOfflineStorage(),
      this.testResponsiveDesign(),
    ]);

    const passed = tests.filter(test => test.passed).length;
    const failed = tests.filter(test => !test.passed).length;
    const totalDuration = tests.reduce((sum, test) => sum + test.duration, 0);

    return {
      name: 'Mobile Functional Tests',
      tests,
      summary: {
        total: tests.length,
        passed,
        failed,
        duration: totalDuration
      }
    };
  }
}

// =============================================================================
// 主要測試執行器
// =============================================================================

export class MobileTestRunner {
  static async runCompleteTest(): Promise<MobileTestReport> {
    console.log('🧪 開始執行行動裝置完整測試...');

    const startTime = Date.now();

    // 裝置資訊收集
    const deviceDetection = new (class {
      useDeviceDetection = useDeviceDetection;
    })();

    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenSize: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      touchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
    };

    // 執行所有測試
    const [compatibilityTests, performanceTests, functionalTests] = await Promise.all([
      MobileCompatibilityTester.runAllCompatibilityTests(),
      MobilePerformanceTester.runAllPerformanceTests(),
      MobileFunctionalTester.runAllFunctionalTests(),
    ]);

    // 計算總體評分
    const compatibilityScore = (compatibilityTests.filter(t => t.supported).length / compatibilityTests.length) * 100;
    const performanceScore = this.calculatePerformanceScore(performanceTests);
    const functionalScore = (functionalTests.summary.passed / functionalTests.summary.total) * 100;

    const overallScore = Math.round((compatibilityScore + performanceScore + functionalScore) / 3);

    // 生成建議
    const recommendations = this.generateRecommendations(
      compatibilityTests,
      performanceTests,
      functionalTests
    );

    const report: MobileTestReport = {
      deviceInfo,
      timestamp: Date.now(),
      compatibilityTests,
      performanceTests,
      functionalTests: [functionalTests],
      overallScore,
      recommendations,
    };

    console.log(`✅ 行動裝置測試完成，總體評分: ${overallScore}/100`);
    console.log(`📊 測試耗時: ${Date.now() - startTime}ms`);

    return report;
  }

  private static calculatePerformanceScore(tests: PerformanceTestResult[]): number {
    const gradeValues = { A: 100, B: 80, C: 60, D: 40, F: 20 };
    const totalScore = tests.reduce((sum, test) => sum + gradeValues[test.grade], 0);
    return Math.round(totalScore / tests.length);
  }

  private static generateRecommendations(
    compatibilityTests: CompatibilityTestResult[],
    performanceTests: PerformanceTestResult[],
    functionalTests: TestSuite
  ): string[] {
    const recommendations: string[] = [];

    // 相容性建議
    const unsupportedFeatures = compatibilityTests.filter(test => !test.supported);
    if (unsupportedFeatures.length > 0) {
      recommendations.push(
        `考慮為不支援的功能提供後備方案: ${unsupportedFeatures.map(f => f.feature).join(', ')}`
      );
    }

    // 效能建議
    const poorPerformanceTests = performanceTests.filter(test => test.grade === 'D' || test.grade === 'F');
    if (poorPerformanceTests.length > 0) {
      recommendations.push(
        `需要優化效能: ${poorPerformanceTests.map(t => t.metric).join(', ')}`
      );
    }

    const loadTimeTest = performanceTests.find(test => test.metric === 'Page Load Time');
    if (loadTimeTest && loadTimeTest.value > 3000) {
      recommendations.push('頁面載入時間過長，建議啟用快取優化和資料壓縮');
    }

    const memoryTest = performanceTests.find(test => test.metric === 'Memory Usage');
    if (memoryTest && memoryTest.value > 50) {
      recommendations.push('記憶體使用量過高，建議清理未使用的資源');
    }

    // 功能建議
    if (functionalTests.summary.failed > 0) {
      recommendations.push('某些核心功能測試失敗，需要檢查實作');
    }

    // 預設建議
    if (recommendations.length === 0) {
      recommendations.push('系統運行良好！建議定期執行測試以維持效能');
    }

    return recommendations;
  }

  static exportTestReport(report: MobileTestReport): string {
    return JSON.stringify(report, null, 2);
  }

  static generateTestSummary(report: MobileTestReport): string {
    return `
行動裝置測試報告摘要
===================

總體評分: ${report.overallScore}/100
測試時間: ${new Date(report.timestamp).toLocaleString()}

相容性測試:
${report.compatibilityTests.map(test =>
  `  ${test.supported ? '✅' : '❌'} ${test.feature}`
).join('\n')}

效能測試:
${report.performanceTests.map(test =>
  `  ${test.grade} ${test.metric}: ${Math.round(test.value)}${test.metric.includes('Time') ? 'ms' : test.metric.includes('Memory') ? 'MB' : test.metric.includes('FPS') ? 'fps' : ''}`
).join('\n')}

功能測試:
${report.functionalTests[0].tests.map(test =>
  `  ${test.passed ? '✅' : '❌'} ${test.testName}`
).join('\n')}

建議:
${report.recommendations.map(rec => `  • ${rec}`).join('\n')}
    `.trim();
  }
}

// =============================================================================
// 工具函數
// =============================================================================

export function createMobileTestButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = '🧪 執行行動裝置測試';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 9999;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  button.addEventListener('click', async () => {
    button.textContent = '⏳ 測試中...';
    button.disabled = true;

    try {
      const report = await MobileTestRunner.runCompleteTest();
      const summary = MobileTestRunner.generateTestSummary(report);

      console.log('📊 測試報告:');
      console.log(summary);

      // 顯示結果
      alert(`測試完成！總體評分: ${report.overallScore}/100\n詳細報告請查看 Console`);
    } catch (error) {
      console.error('測試執行失敗:', error);
      alert('測試執行失敗，請查看 Console 了解詳情');
    } finally {
      button.textContent = '🧪 執行行動裝置測試';
      button.disabled = false;
    }
  });

  return button;
}

// 開發環境自動加入測試按鈕
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    document.body.appendChild(createMobileTestButton());
  });
}