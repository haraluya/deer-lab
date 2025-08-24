const fs = require('fs');
const path = require('path');

// 驗證建置結果
function verifyBuild() {
  const outDir = path.join(__dirname, '..', 'out');
  
  console.log('🔍 驗證建置結果...');
  
  // 檢查 out 目錄是否存在
  if (!fs.existsSync(outDir)) {
    console.error('❌ out 目錄不存在');
    return false;
  }
  
  // 檢查必要的檔案
  const requiredFiles = [
    'index.html',
    'dashboard.html',
    'static/css',
    'static/chunks'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 不存在`);
      allFilesExist = false;
    }
  });
  
  // 檢查 index.html 的內容
  const indexPath = path.join(outDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // 檢查是否包含正確的路徑
    if (content.includes('./static/')) {
      console.log('✅ index.html 包含正確的靜態檔案路徑');
    } else if (content.includes('/_next/static/')) {
      console.log('⚠️ index.html 仍包含 /_next/static/ 路徑');
    } else {
      console.log('❓ index.html 路徑格式未知');
    }
    
    // 檢查是否包含 JavaScript 檔案
    if (content.includes('.js')) {
      console.log('✅ index.html 包含 JavaScript 檔案引用');
    } else {
      console.log('❌ index.html 不包含 JavaScript 檔案引用');
    }
  }
  
  // 列出所有檔案
  console.log('\n📁 out 目錄內容:');
  const files = fs.readdirSync(outDir);
  files.forEach(file => {
    const filePath = path.join(outDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`📁 ${file}/`);
    } else {
      console.log(`📄 ${file}`);
    }
  });
  
  return allFilesExist;
}

// 執行驗證
if (verifyBuild()) {
  console.log('\n✅ 建置驗證通過');
} else {
  console.log('\n❌ 建置驗證失敗');
  process.exit(1);
}
