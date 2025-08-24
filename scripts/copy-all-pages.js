const fs = require('fs');
const path = require('path');

// 複製所有頁面到 out 目錄
function copyAllPages() {
  const outDir = path.join(__dirname, '..', 'out');
  const nextServerDir = path.join(__dirname, '..', '.next', 'server');
  
  console.log('📁 複製所有頁面到 out 目錄...');
  
  if (!fs.existsSync(outDir)) {
    console.error('❌ out 目錄不存在');
    return;
  }
  
  if (!fs.existsSync(nextServerDir)) {
    console.error('❌ .next/server 目錄不存在');
    return;
  }
  
  // 遞迴複製所有 HTML 檔案
  function copyHtmlFiles(dir, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const sourcePath = path.join(dir, file);
      const targetPath = path.join(targetDir, file);
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        copyHtmlFiles(sourcePath, targetPath);
      } else if (file.endsWith('.html')) {
        // 複製 HTML 檔案
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ 複製: ${path.relative(nextServerDir, sourcePath)} -> ${path.relative(outDir, targetPath)}`);
      }
    });
  }
  
  // 複製所有 HTML 檔案
  copyHtmlFiles(nextServerDir, outDir);
  
  // 確保特定頁面存在
  const requiredPages = [
    'dashboard.html',
    'dashboard/inventory.html',
    'dashboard/personnel.html',
    'dashboard/materials.html',
    'dashboard/products.html',
    'dashboard/work-orders.html',
    'dashboard/purchase-orders.html',
    'dashboard/fragrances.html',
    'dashboard/product-series.html',
    'dashboard/roles.html',
    'dashboard/material-categories.html',
    'dashboard/suppliers.html',
    'dashboard/production-calculator.html',
    'dashboard/reports.html',
    'dashboard/cost-management.html'
  ];
  
  console.log('\n🔍 檢查必要頁面...');
  requiredPages.forEach(page => {
    const pagePath = path.join(outDir, page);
    if (fs.existsSync(pagePath)) {
      console.log(`✅ ${page} 存在`);
    } else {
      console.log(`❌ ${page} 不存在`);
      
      // 創建基本的頁面
      const basicHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Deer Lab - ${page.replace('.html', '').replace(/\//g, ' ')}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div id="root">
        <h1>Deer Lab</h1>
        <p>Loading ${page.replace('.html', '').replace(/\//g, ' ')}...</p>
    </div>
    <script>
        // 重定向到主應用
        window.location.href = '/dashboard';
    </script>
</body>
</html>`;
      
      // 確保目錄存在
      const pageDir = path.dirname(pagePath);
      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }
      
      fs.writeFileSync(pagePath, basicHtml);
      console.log(`✅ 創建了 ${page}`);
    }
  });
  
  console.log('\n📊 統計資訊:');
  const htmlFiles = [];
  function countHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        countHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(path.relative(outDir, filePath));
      }
    });
  }
  
  countHtmlFiles(outDir);
  console.log(`總共 ${htmlFiles.length} 個 HTML 檔案:`);
  htmlFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
}

// 執行複製
copyAllPages();
