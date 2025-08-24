const fs = require('fs');
const path = require('path');

// 測試建置結果
function testBuild() {
  console.log('🧪 測試建置結果...');
  
  const outDir = path.join(__dirname, '..', 'out');
  
  if (!fs.existsSync(outDir)) {
    console.error('❌ out 目錄不存在');
    return;
  }
  
  // 檢查靜態檔案
  console.log('\n📁 檢查靜態檔案...');
  const staticDir = path.join(outDir, 'static');
  if (fs.existsSync(staticDir)) {
    console.log('✅ static 目錄存在');
    
    // 檢查 CSS 檔案
    const cssDir = path.join(staticDir, 'css');
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir);
      console.log(`✅ CSS 檔案: ${cssFiles.length} 個`);
      cssFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    // 檢查 JavaScript 檔案
    const chunksDir = path.join(staticDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
      const jsFiles = fs.readdirSync(chunksDir);
      console.log(`✅ JavaScript 檔案: ${jsFiles.length} 個`);
      jsFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
  } else {
    console.error('❌ static 目錄不存在');
  }
  
  // 檢查 HTML 檔案
  console.log('\n📄 檢查 HTML 檔案...');
  const htmlFiles = [];
  function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        findHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(path.relative(outDir, filePath));
      }
    });
  }
  
  findHtmlFiles(outDir);
  console.log(`✅ HTML 檔案: ${htmlFiles.length} 個`);
  htmlFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  // 檢查特定頁面
  console.log('\n🔍 檢查特定頁面...');
  const requiredPages = [
    'index.html',
    'dashboard.html',
    'dashboard/inventory.html',
    'dashboard/personnel.html',
    'dashboard/materials.html'
  ];
  
  requiredPages.forEach(page => {
    const pagePath = path.join(outDir, page);
    if (fs.existsSync(pagePath)) {
      console.log(`✅ ${page} 存在`);
      
      // 檢查頁面內容
      const content = fs.readFileSync(pagePath, 'utf8');
      
      // 檢查路徑
      if (content.includes('./static/')) {
        console.log(`   ✅ ${page} 包含正確的靜態檔案路徑`);
      } else if (content.includes('/_next/static/')) {
        console.log(`   ❌ ${page} 仍包含 /_next/static/ 路徑`);
      } else {
        console.log(`   ❓ ${page} 路徑格式未知`);
      }
      
      // 檢查 JavaScript 引用
      const scriptMatches = content.match(/src="[^"]*\.js"/g);
      if (scriptMatches) {
        console.log(`   📜 ${page} 包含 ${scriptMatches.length} 個 JavaScript 引用`);
      }
    } else {
      console.log(`❌ ${page} 不存在`);
    }
  });
  
  // 檢查 manifest.json
  console.log('\n📋 檢查 manifest.json...');
  const manifestPath = path.join(outDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log('✅ manifest.json 存在');
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log('✅ manifest.json 格式正確');
    } catch (error) {
      console.error('❌ manifest.json 格式錯誤:', error.message);
    }
  } else {
    console.error('❌ manifest.json 不存在');
  }
  
  console.log('\n✅ 測試完成！');
}

// 執行測試
testBuild();
