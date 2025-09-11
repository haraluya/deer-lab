/**
 * Google Cloud 全面空間清理工具
 * 
 * 針對 deer-lab 專案的完整空間使用分析與清理建議
 */

const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

// 清理配置
const CLEANUP_CONFIG = {
  // 主要 buckets
  buckets: {
    'deer-lab.firebasestorage.app': {
      description: 'Firebase Storage (主要檔案儲存)',
      autoClean: false,  // 使用者檔案，不自動清理
    },
    'deerlab01': {
      description: 'Firestore 資料備份',
      autoClean: true,
      keepLatest: 2,  // 保留最新 2 個備份
    },
    'gcf-v2-sources-554942047858-us-central1': {
      description: 'Functions 原始碼備份',
      autoClean: true,
      keepLatest: 0,  // 全部清除（已清理過）
    },
    'gcf-v2-uploads-554942047858.us-central1.cloudfunctions.appspot.com': {
      description: 'Functions 上傳暫存',
      autoClean: true,
      keepLatest: 0,  // 暫存檔案可全部清除
    }
  },
  
  // 乾跑模式
  dryRun: true,
  
  // 最小檔案大小過濾（MB）
  minSizeMB: 1,
};

async function analyzeBucketUsage() {
  console.log('🔍 Google Cloud 專案空間使用分析\n');
  
  let totalUsage = 0;
  let potentialSavings = 0;
  
  for (const [bucketName, config] of Object.entries(CLEANUP_CONFIG.buckets)) {
    try {
      console.log(`📁 分析 bucket: ${bucketName}`);
      console.log(`   描述: ${config.description}`);
      
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles();
      
      let bucketSize = 0;
      let bucketSavings = 0;
      
      if (files.length === 0) {
        console.log(`   ✅ 空的 bucket (0 MB)\n`);
        continue;
      }
      
      // 按類型分組分析
      const filesByType = groupFilesByType(files);
      
      for (const [type, typeFiles] of Object.entries(filesByType)) {
        const typeSize = typeFiles.reduce((sum, file) => sum + parseInt(file.metadata.size || 0), 0);
        const typeSizeMB = typeSize / (1024 * 1024);
        bucketSize += typeSizeMB;
        
        console.log(`   📄 ${type}: ${typeFiles.length} 檔案, ${typeSizeMB.toFixed(2)} MB`);
        
        // 計算可清理的檔案
        if (config.autoClean) {
          const cleanableSize = calculateCleanableSize(typeFiles, config.keepLatest);
          const cleanableMB = cleanableSize / (1024 * 1024);
          bucketSavings += cleanableMB;
          
          if (cleanableMB > 0) {
            console.log(`     🗑️  可清理: ${cleanableMB.toFixed(2)} MB`);
          }
        }
      }
      
      console.log(`   📊 總計: ${bucketSize.toFixed(2)} MB`);
      if (bucketSavings > 0) {
        console.log(`   💰 可節省: ${bucketSavings.toFixed(2)} MB`);
      }
      console.log('');
      
      totalUsage += bucketSize;
      potentialSavings += bucketSavings;
      
    } catch (error) {
      console.log(`   ❌ 無法存取: ${error.message}\n`);
    }
  }
  
  return { totalUsage, potentialSavings };
}

function groupFilesByType(files) {
  const groups = {
    'Firestore 備份': [],
    'Functions 原始碼': [],
    'Functions 暫存': [],
    '圖片檔案': [],
    '其他檔案': []
  };
  
  files.forEach(file => {
    const name = file.name.toLowerCase();
    const size = parseInt(file.metadata.size || 0);
    
    // 只處理大於最小大小的檔案
    if (size < CLEANUP_CONFIG.minSizeMB * 1024 * 1024) return;
    
    if (name.includes('overall_export_metadata') || name.includes('export_metadata') || name.includes('output-')) {
      groups['Firestore 備份'].push(file);
    } else if (name.includes('function-source.zip')) {
      groups['Functions 原始碼'].push(file);
    } else if (name.includes('.zip') && file.bucket.name.includes('uploads')) {
      groups['Functions 暫存'].push(file);
    } else if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      groups['圖片檔案'].push(file);
    } else {
      groups['其他檔案'].push(file);
    }
  });
  
  // 移除空的群組
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
}

function calculateCleanableSize(files, keepLatest) {
  if (keepLatest === 0) {
    // 全部清理
    return files.reduce((sum, file) => sum + parseInt(file.metadata.size || 0), 0);
  }
  
  // 按時間排序，保留最新的
  const sortedFiles = files.sort((a, b) => 
    new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated)
  );
  
  const filesToDelete = sortedFiles.slice(keepLatest);
  return filesToDelete.reduce((sum, file) => sum + parseInt(file.metadata.size || 0), 0);
}

async function generateCleanupPlan() {
  console.log('🧹 清理計畫生成\n');
  
  const plan = {
    immediate: [],  // 立即可清理
    scheduled: [],  // 建議定期清理
    manual: []      // 需手動檢查
  };
  
  // Firestore 備份清理
  plan.scheduled.push({
    target: 'deerlab01 bucket (Firestore 備份)',
    action: '保留最新 2 個備份，刪除舊備份',
    frequency: '每月',
    estimatedSaving: '約 1-2 MB',
    priority: 'medium'
  });
  
  // Functions 暫存檔清理  
  plan.immediate.push({
    target: 'gcf-v2-uploads bucket (Functions 暫存)',
    action: '清理 314MB 的暫存上傳檔案',
    estimatedSaving: '314 MB',
    priority: 'high'
  });
  
  // 剩餘的 Functions 原始碼
  plan.immediate.push({
    target: 'resetUser052Password 函數原始碼',
    action: '清理剩餘的 282KB 原始碼備份',
    estimatedSaving: '282 KB',
    priority: 'low'
  });
  
  // Firebase Storage 檢查
  plan.manual.push({
    target: 'deer-lab.firebasestorage.app (主要儲存)',
    action: '檢查是否有未使用的使用者上傳檔案',
    note: '目前為空，但建議定期檢查',
    priority: 'low'
  });
  
  return plan;
}

async function executeCleanup(plan) {
  if (CLEANUP_CONFIG.dryRun) {
    console.log('🔄 乾跑模式 - 僅顯示清理計畫\n');
    return;
  }
  
  console.log('🚀 執行清理操作...\n');
  
  // 執行立即清理
  for (const item of plan.immediate) {
    console.log(`🗑️  處理: ${item.target}`);
    // 實際清理邏輯會在這裡實現
  }
}

async function main() {
  try {
    console.log('📊 deer-lab 專案空間使用分析報告\n');
    console.log('=' * 50 + '\n');
    
    // 1. 分析現狀
    const { totalUsage, potentialSavings } = await analyzeBucketUsage();
    
    console.log('📈 使用狀況摘要:');
    console.log(`   總使用空間: ${totalUsage.toFixed(2)} MB`);
    console.log(`   可節省空間: ${potentialSavings.toFixed(2)} MB`);
    console.log(`   節省比例: ${(potentialSavings / totalUsage * 100).toFixed(1)}%`);
    console.log(`   預估月費節省: $${(potentialSavings * 0.02 / 1024).toFixed(4)} USD\n`);
    
    // 2. 生成清理計畫
    const plan = await generateCleanupPlan();
    
    console.log('📋 清理建議:');
    
    if (plan.immediate.length > 0) {
      console.log('\n🚨 立即清理 (推薦):');
      plan.immediate.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.target}`);
        console.log(`      動作: ${item.action}`);
        console.log(`      可節省: ${item.estimatedSaving}`);
        console.log(`      優先級: ${item.priority}\n`);
      });
    }
    
    if (plan.scheduled.length > 0) {
      console.log('⏰ 定期維護:');
      plan.scheduled.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.target}`);
        console.log(`      動作: ${item.action}`);
        console.log(`      頻率: ${item.frequency}`);
        console.log(`      可節省: ${item.estimatedSaving}\n`);
      });
    }
    
    if (plan.manual.length > 0) {
      console.log('👀 手動檢查:');
      plan.manual.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.target}`);
        console.log(`      建議: ${item.action}`);
        if (item.note) console.log(`      備註: ${item.note}`);
        console.log('');
      });
    }
    
    // 3. 執行清理
    await executeCleanup(plan);
    
    console.log('✅ 分析完成！');
    
  } catch (error) {
    console.error('❌ 分析過程發生錯誤:', error.message);
  }
}

// 執行主程式
main();