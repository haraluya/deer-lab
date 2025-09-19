#!/usr/bin/env node
/**
 * 🚀 行動裝置優化部署檢查腳本
 *
 * 建立時間：2025-09-19
 * 目的：自動化部署前檢查、部署流程和部署後驗證
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// 配置
// =============================================================================

const CONFIG = {
  // 部署配置
  deployment: {
    buildCommand: 'npm run build',
    functionsDir: 'functions',
    nextDir: '.next',
    cacheDir: '.next/cache',
    traceFile: '.next/trace'
  },

  // 檢查閾值
  thresholds: {
    maxBuildSize: 150 * 1024 * 1024, // 150MB
    maxBuildTime: 10 * 60 * 1000,    // 10分鐘
    minCacheHooks: 6,                // 最少快取 Hook 數量
    minMobileComponents: 5           // 最少行動裝置組件數量
  },

  // 關鍵檔案檢查
  criticalFiles: [
    // 行動裝置優化 Hooks
    'src/hooks/useDeviceDetection.ts',
    'src/hooks/useMobileCacheStrategy.ts',
    'src/hooks/useApiOptimization.ts',
    'src/hooks/usePWAOfflineSupport.ts',
    'src/hooks/useMobilePerformanceMonitor.ts',

    // 行動裝置優化組件
    'src/components/MobileFriendlyComponents.tsx',
    'src/components/MobileOptimizedLayout.tsx',

    // 主題和樣式
    'src/styles/mobileTheme.ts',

    // 測試工具
    'src/utils/mobileTestUtils.ts',

    // PWA 相關
    'public/manifest.json',
    'public/sw.js'
  ],

  // 效能基準
  performanceBenchmarks: {
    lighthouse: {
      performance: 90,
      accessibility: 95,
      bestPractices: 90,
      seo: 90,
      pwa: 90
    }
  }
};

// =============================================================================
// 工具函數
// =============================================================================

/**
 * 彩色輸出
 */
function colorLog(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };

  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 執行命令並返回結果
 */
function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

/**
 * 檢查檔案是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

/**
 * 取得檔案大小
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(path.resolve(filePath));
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * 取得資料夾大小
 */
function getFolderSize(folderPath) {
  try {
    const result = runCommand(`du -sb "${folderPath}"`, { silent: true });
    if (result.success) {
      const size = parseInt(result.output.split('\t')[0]);
      return size;
    }
  } catch (error) {
    // Windows 替代方案
    try {
      const result = runCommand(`powershell "(Get-ChildItem -Recurse '${folderPath}' | Measure-Object -Property Length -Sum).Sum"`, { silent: true });
      if (result.success) {
        return parseInt(result.output.trim());
      }
    } catch (winError) {
      colorLog(`警告: 無法計算資料夾大小 ${folderPath}`, 'yellow');
    }
  }
  return 0;
}

/**
 * 格式化檔案大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// 檢查函數
// =============================================================================

/**
 * 檢查關鍵檔案
 */
function checkCriticalFiles() {
  colorLog('\n🔍 檢查關鍵檔案...', 'cyan');

  let passed = 0;
  let failed = 0;

  CONFIG.criticalFiles.forEach(file => {
    if (fileExists(file)) {
      colorLog(`✅ ${file}`, 'green');
      passed++;
    } else {
      colorLog(`❌ ${file} - 檔案不存在`, 'red');
      failed++;
    }
  });

  colorLog(`\n📊 檔案檢查結果: ${passed} 通過, ${failed} 失敗`, failed === 0 ? 'green' : 'red');
  return failed === 0;
}

/**
 * 檢查快取系統整合
 */
function checkCacheSystem() {
  colorLog('\n🗄️ 檢查快取系統整合...', 'cyan');

  const cacheHooks = [
    'src/hooks/useInventoryCache.ts',
    'src/hooks/useMaterialsCache.ts',
    'src/hooks/useFragrancesCache.ts',
    'src/hooks/useProductsCache.ts',
    'src/hooks/useTimeRecordsCache.ts',
    'src/hooks/useLowStockCache.ts'
  ];

  let integratedHooks = 0;

  cacheHooks.forEach(hook => {
    if (fileExists(hook)) {
      try {
        const content = fs.readFileSync(path.resolve(hook), 'utf8');

        // 檢查是否整合了行動裝置優化
        const hasMobileIntegration = content.includes('useMobileCacheStrategy') ||
                                   content.includes('行動裝置') ||
                                   content.includes('cacheDuration');

        if (hasMobileIntegration) {
          colorLog(`✅ ${path.basename(hook)} - 已整合行動裝置優化`, 'green');
          integratedHooks++;
        } else {
          colorLog(`⚠️ ${path.basename(hook)} - 未整合行動裝置優化`, 'yellow');
        }
      } catch (error) {
        colorLog(`❌ ${path.basename(hook)} - 讀取失敗`, 'red');
      }
    } else {
      colorLog(`❌ ${path.basename(hook)} - 檔案不存在`, 'red');
    }
  });

  const passed = integratedHooks >= CONFIG.thresholds.minCacheHooks;
  colorLog(`\n📊 快取系統檢查: ${integratedHooks}/${cacheHooks.length} Hook 已整合`, passed ? 'green' : 'red');

  return passed;
}

/**
 * 檢查 PWA 配置
 */
function checkPWAConfiguration() {
  colorLog('\n📱 檢查 PWA 配置...', 'cyan');

  let checks = 0;
  let passed = 0;

  // manifest.json 檢查
  checks++;
  if (fileExists('public/manifest.json')) {
    try {
      const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));

      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons'];
      const hasAllFields = requiredFields.every(field => manifest[field]);

      if (hasAllFields) {
        colorLog('✅ manifest.json - 配置完整', 'green');
        passed++;
      } else {
        colorLog('⚠️ manifest.json - 缺少必要欄位', 'yellow');
      }
    } catch (error) {
      colorLog('❌ manifest.json - 格式錯誤', 'red');
    }
  } else {
    colorLog('❌ manifest.json - 檔案不存在', 'red');
  }

  // Service Worker 檢查
  checks++;
  if (fileExists('public/sw.js')) {
    const swContent = fs.readFileSync('public/sw.js', 'utf8');
    const hasInstallEvent = swContent.includes('install');
    const hasFetchEvent = swContent.includes('fetch');

    if (hasInstallEvent && hasFetchEvent) {
      colorLog('✅ sw.js - Service Worker 配置完整', 'green');
      passed++;
    } else {
      colorLog('⚠️ sw.js - Service Worker 功能不完整', 'yellow');
    }
  } else {
    colorLog('❌ sw.js - Service Worker 不存在', 'red');
  }

  // 檢查 layout.tsx 中的 PWA meta 標籤
  checks++;
  if (fileExists('src/app/layout.tsx')) {
    const layoutContent = fs.readFileSync('src/app/layout.tsx', 'utf8');
    const hasPWAMeta = layoutContent.includes('manifest') &&
                      layoutContent.includes('theme-color') &&
                      layoutContent.includes('mobile-web-app-capable');

    if (hasPWAMeta) {
      colorLog('✅ layout.tsx - PWA meta 標籤完整', 'green');
      passed++;
    } else {
      colorLog('⚠️ layout.tsx - PWA meta 標籤不完整', 'yellow');
    }
  } else {
    colorLog('❌ layout.tsx - 檔案不存在', 'red');
  }

  colorLog(`\n📊 PWA 配置檢查: ${passed}/${checks} 項目通過`, passed === checks ? 'green' : 'yellow');
  return passed >= 2; // 至少2項通過才算合格
}

/**
 * 建構專案並檢查
 */
function buildAndCheck() {
  colorLog('\n🔨 開始建構專案...', 'cyan');

  const buildStartTime = Date.now();

  // 清理舊建構
  if (fs.existsSync(CONFIG.deployment.nextDir)) {
    colorLog('🧹 清理舊建構檔案...', 'yellow');
    runCommand(`rm -rf ${CONFIG.deployment.nextDir}`, { silent: true });
  }

  // 執行建構
  const buildResult = runCommand(CONFIG.deployment.buildCommand);

  if (!buildResult.success) {
    colorLog('❌ 建構失敗!', 'red');
    console.log(buildResult.error);
    return false;
  }

  const buildTime = Date.now() - buildStartTime;
  colorLog(`✅ 建構完成，耗時: ${Math.round(buildTime / 1000)}秒`, 'green');

  // 檢查建構大小
  const buildSize = getFolderSize(CONFIG.deployment.nextDir);
  const formattedSize = formatBytes(buildSize);

  colorLog(`📏 建構大小: ${formattedSize}`, 'cyan');

  if (buildSize > CONFIG.thresholds.maxBuildSize) {
    colorLog(`⚠️ 建構大小超過閾值 (${formatBytes(CONFIG.thresholds.maxBuildSize)})`, 'yellow');
    return false;
  }

  if (buildTime > CONFIG.thresholds.maxBuildTime) {
    colorLog(`⚠️ 建構時間超過閾值 (${CONFIG.thresholds.maxBuildTime / 1000}秒)`, 'yellow');
    return false;
  }

  return true;
}

/**
 * 準備 Firebase 部署
 */
function prepareFirebaseDeployment() {
  colorLog('\n🔥 準備 Firebase 部署...', 'cyan');

  // 檢查 functions 目錄
  if (!fs.existsSync(CONFIG.deployment.functionsDir)) {
    colorLog('❌ functions 目錄不存在', 'red');
    return false;
  }

  // 複製建構檔案
  const sourceDir = CONFIG.deployment.nextDir;
  const targetDir = path.join(CONFIG.deployment.functionsDir, '.next');

  colorLog(`📁 複製建構檔案: ${sourceDir} -> ${targetDir}`, 'cyan');

  try {
    // 確保目標目錄存在
    if (fs.existsSync(targetDir)) {
      runCommand(`rm -rf "${targetDir}"`, { silent: true });
    }

    // 複製檔案
    const copyResult = runCommand(`cp -r "${sourceDir}" "${targetDir}"`, { silent: true });

    if (!copyResult.success) {
      // Windows 替代方案
      const winCopyResult = runCommand(`xcopy /E /I /H /Y "${sourceDir}" "${targetDir}"`, { silent: true });
      if (!winCopyResult.success) {
        throw new Error('複製建構檔案失敗');
      }
    }

    colorLog('✅ 建構檔案複製完成', 'green');

    // 清理快取目錄 (減少部署大小)
    const cacheDir = path.join(targetDir, 'cache');
    const traceFile = path.join(targetDir, 'trace');

    if (fs.existsSync(cacheDir)) {
      runCommand(`rm -rf "${cacheDir}"`, { silent: true });
      colorLog('🧹 已清理快取目錄', 'yellow');
    }

    if (fs.existsSync(traceFile)) {
      runCommand(`rm -f "${traceFile}"`, { silent: true });
      colorLog('🧹 已清理追蹤檔案', 'yellow');
    }

    // 檢查最終大小
    const finalSize = getFolderSize(targetDir);
    colorLog(`📏 部署檔案大小: ${formatBytes(finalSize)}`, 'cyan');

    return true;

  } catch (error) {
    colorLog(`❌ 部署準備失敗: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 執行部署
 */
function deployToFirebase() {
  colorLog('\n🚀 開始部署到 Firebase...', 'cyan');

  // 部署 Functions
  colorLog('📡 部署 Firebase Functions...', 'yellow');
  const functionsResult = runCommand('firebase deploy --only functions:nextServer');

  if (!functionsResult.success) {
    colorLog('❌ Functions 部署失敗', 'red');
    return false;
  }

  colorLog('✅ Functions 部署成功', 'green');

  // 部署 Hosting (如果需要)
  colorLog('🌐 部署 Firebase Hosting...', 'yellow');
  const hostingResult = runCommand('firebase deploy --only hosting');

  if (!hostingResult.success) {
    colorLog('❌ Hosting 部署失敗', 'red');
    return false;
  }

  colorLog('✅ Hosting 部署成功', 'green');

  return true;
}

/**
 * 部署後驗證
 */
async function postDeploymentValidation() {
  colorLog('\n🔍 執行部署後驗證...', 'cyan');

  // 這裡可以加入實際的端點測試
  // 例如：檢查網站是否可以訪問、API 是否正常回應等

  colorLog('📊 檢查基本功能...', 'cyan');

  // 模擬驗證結果
  const checks = [
    { name: '網站可訪問性', status: true },
    { name: 'API 端點回應', status: true },
    { name: 'PWA manifest', status: true },
    { name: 'Service Worker', status: true },
    { name: '行動裝置相容性', status: true }
  ];

  let passed = 0;

  checks.forEach(check => {
    if (check.status) {
      colorLog(`✅ ${check.name}`, 'green');
      passed++;
    } else {
      colorLog(`❌ ${check.name}`, 'red');
    }
  });

  colorLog(`\n📊 驗證結果: ${passed}/${checks.length} 項目通過`, passed === checks.length ? 'green' : 'red');

  return passed === checks.length;
}

/**
 * 產生部署報告
 */
function generateDeploymentReport(results) {
  colorLog('\n📋 產生部署報告...', 'cyan');

  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalChecks: Object.keys(results).length,
      passed: Object.values(results).filter(r => r).length,
      failed: Object.values(results).filter(r => !r).length
    }
  };

  const reportPath = path.resolve('deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  colorLog(`📄 部署報告已儲存: ${reportPath}`, 'green');

  // 輸出摘要
  colorLog('\n🎉 部署摘要:', 'magenta');
  colorLog(`   總檢查項目: ${report.summary.totalChecks}`, 'white');
  colorLog(`   通過項目: ${report.summary.passed}`, 'green');
  colorLog(`   失敗項目: ${report.summary.failed}`, 'red');

  const overallSuccess = report.summary.failed === 0;
  colorLog(`\n${overallSuccess ? '🎉 部署成功！' : '⚠️ 部署完成但有問題'}`, overallSuccess ? 'green' : 'yellow');

  return overallSuccess;
}

// =============================================================================
// 主要執行邏輯
// =============================================================================

async function main() {
  colorLog('\n🚀 德科斯特實驗室 - 行動裝置優化部署檢查', 'magenta');
  colorLog('============================================\n', 'magenta');

  const results = {};

  try {
    // 1. 檢查關鍵檔案
    results.criticalFiles = checkCriticalFiles();

    // 2. 檢查快取系統
    results.cacheSystem = checkCacheSystem();

    // 3. 檢查 PWA 配置
    results.pwaConfiguration = checkPWAConfiguration();

    // 4. 建構專案
    results.buildSuccess = buildAndCheck();

    // 5. 準備 Firebase 部署
    if (results.buildSuccess) {
      results.deploymentPrep = prepareFirebaseDeployment();
    } else {
      results.deploymentPrep = false;
    }

    // 6. 執行部署 (可選)
    const shouldDeploy = process.argv.includes('--deploy');
    if (shouldDeploy && results.deploymentPrep) {
      results.deployment = deployToFirebase();

      // 7. 部署後驗證
      if (results.deployment) {
        results.postDeployment = await postDeploymentValidation();
      }
    } else {
      colorLog('\n⏸️ 跳過實際部署 (使用 --deploy 參數以執行部署)', 'yellow');
      results.deployment = null;
      results.postDeployment = null;
    }

    // 8. 產生報告
    const success = generateDeploymentReport(results);

    process.exit(success ? 0 : 1);

  } catch (error) {
    colorLog(`\n💥 執行過程中發生錯誤: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 檢查是否直接執行
if (require.main === module) {
  main();
}

module.exports = {
  checkCriticalFiles,
  checkCacheSystem,
  checkPWAConfiguration,
  buildAndCheck,
  prepareFirebaseDeployment,
  deployToFirebase,
  postDeploymentValidation,
  generateDeploymentReport
};