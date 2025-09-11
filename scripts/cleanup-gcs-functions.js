/**
 * Google Cloud Storage 函數原始碼清理腳本
 * 
 * 這個腳本會清理 Firebase Functions 部署產生的過大 function-source.zip 檔案
 * 這些檔案通常每個都有 300+MB，會佔用大量的 Cloud Storage 空間
 * 
 * 執行前請確保：
 * 1. 已安裝 Google Cloud SDK: npm install -g @google-cloud/storage
 * 2. 已設定 Google Cloud 認證: gcloud auth login
 * 3. 已設定正確的專案: gcloud config set project your-project-id
 */

const { Storage } = require('@google-cloud/storage');

// 初始化 Cloud Storage
const storage = new Storage();

// 設定參數
const CONFIG = {
  // 你的 bucket 名稱，從截圖看是這個格式
  bucketName: 'gcf-v2-sources-554942047858-us-central1',
  
  // 要清理的檔案模式
  filePattern: 'function-source.zip',
  
  // 保留最新幾個版本（設為 0 表示全部清除）
  keepLatestVersions: 0,
  
  // 乾跑模式：設為 false 時實際執行刪除
  dryRun: false,
  
  // 最小檔案大小過濾器（MB）- 只清理大於此大小的檔案
  minFileSizeMB: 100
};

async function listFunctionSourceFiles() {
  console.log(`🔍 正在掃描 bucket: ${CONFIG.bucketName}`);
  console.log(`📁 尋找檔案模式: ${CONFIG.filePattern}`);
  console.log(`📊 最小檔案大小: ${CONFIG.minFileSizeMB}MB\n`);

  const bucket = storage.bucket(CONFIG.bucketName);
  const [files] = await bucket.getFiles();

  // 按資料夾分組的 function-source.zip 檔案
  const functionSourceFiles = {};
  let totalSize = 0;
  let totalCount = 0;

  files.forEach(file => {
    if (file.name.endsWith(CONFIG.filePattern)) {
      const fileSizeMB = parseInt(file.metadata.size) / (1024 * 1024);
      
      // 只處理大於指定大小的檔案
      if (fileSizeMB >= CONFIG.minFileSizeMB) {
        const folderPath = file.name.substring(0, file.name.lastIndexOf('/'));
        
        if (!functionSourceFiles[folderPath]) {
          functionSourceFiles[folderPath] = [];
        }
        
        functionSourceFiles[folderPath].push({
          name: file.name,
          size: fileSizeMB,
          created: new Date(file.metadata.timeCreated),
          file: file
        });
        
        totalSize += fileSizeMB;
        totalCount++;
      }
    }
  });

  console.log(`📈 統計結果:`);
  console.log(`   總檔案數: ${totalCount}`);
  console.log(`   總大小: ${totalSize.toFixed(2)} MB`);
  console.log(`   資料夾數: ${Object.keys(functionSourceFiles).length}\n`);

  // 顯示每個資料夾的檔案數量，幫助分析
  console.log(`📁 各資料夾檔案分布:`);
  Object.entries(functionSourceFiles).forEach(([folder, files]) => {
    const totalFolderSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log(`   ${folder}: ${files.length} 檔案, ${totalFolderSize.toFixed(2)} MB`);
  });
  console.log('');

  return functionSourceFiles;
}

async function cleanupFiles(functionSourceFiles) {
  let deletedCount = 0;
  let deletedSizeMB = 0;
  const filesToDelete = [];

  // 為每個資料夾決定要刪除的檔案
  Object.entries(functionSourceFiles).forEach(([folder, files]) => {
    // 按建立時間排序（最新的在前）
    files.sort((a, b) => b.created.getTime() - a.created.getTime());
    
    // 保留最新的幾個版本，標記其他的為要刪除
    const toDelete = files.slice(CONFIG.keepLatestVersions);
    
    if (toDelete.length > 0) {
      console.log(`📁 資料夾: ${folder}`);
      console.log(`   總檔案: ${files.length}, 保留: ${CONFIG.keepLatestVersions}, 刪除: ${toDelete.length}`);
      
      toDelete.forEach(fileInfo => {
        console.log(`   🗑️  刪除: ${fileInfo.name} (${fileInfo.size.toFixed(2)} MB, ${fileInfo.created.toLocaleDateString()})`);
        filesToDelete.push(fileInfo);
        deletedSizeMB += fileInfo.size;
      });
      
      files.slice(0, CONFIG.keepLatestVersions).forEach(fileInfo => {
        console.log(`   ✅ 保留: ${fileInfo.name} (${fileInfo.size.toFixed(2)} MB, ${fileInfo.created.toLocaleDateString()})`);
      });
      
      console.log('');
    }
  });

  deletedCount = filesToDelete.length;

  console.log(`\n📊 清理摘要:`);
  console.log(`   將刪除檔案數: ${deletedCount}`);
  console.log(`   將釋放空間: ${deletedSizeMB.toFixed(2)} MB`);
  console.log(`   節省費用: 約 $${(deletedSizeMB * 0.02 / 1024).toFixed(4)} USD/月\n`);

  if (CONFIG.dryRun) {
    console.log(`🔄 乾跑模式 - 不會實際刪除檔案`);
    console.log(`⚠️  若要實際執行，請將 CONFIG.dryRun 設為 false\n`);
    return;
  }

  // 實際刪除檔案
  if (filesToDelete.length > 0) {
    console.log(`🚀 開始刪除檔案...`);
    
    for (const fileInfo of filesToDelete) {
      try {
        await fileInfo.file.delete();
        console.log(`✅ 已刪除: ${fileInfo.name}`);
      } catch (error) {
        console.error(`❌ 刪除失敗: ${fileInfo.name} - ${error.message}`);
      }
    }
    
    console.log(`\n🎉 清理完成！已釋放 ${deletedSizeMB.toFixed(2)} MB 空間`);
  }
}

async function main() {
  try {
    console.log('🧹 Google Cloud Functions 原始碼清理工具\n');
    
    const functionSourceFiles = await listFunctionSourceFiles();
    
    if (Object.keys(functionSourceFiles).length === 0) {
      console.log('✨ 沒有找到需要清理的檔案');
      return;
    }
    
    await cleanupFiles(functionSourceFiles);
    
  } catch (error) {
    console.error('❌ 清理過程發生錯誤:', error.message);
    console.error('\n💡 可能的解決方案:');
    console.error('   1. 確認已安裝 @google-cloud/storage: npm install @google-cloud/storage');
    console.error('   2. 確認已登入 Google Cloud: gcloud auth login');
    console.error('   3. 確認已設定正確專案: gcloud config set project your-project-id');
    console.error('   4. 確認有 Storage 的存取權限');
  }
}

// 執行主程式
main();