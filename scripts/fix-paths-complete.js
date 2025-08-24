const fs = require('fs');
const path = require('path');

// 徹底修正所有路徑問題
function fixPathsComplete() {
  const outDir = path.join(__dirname, '..', 'out');
  
  console.log('🔧 徹底修正所有路徑問題...');
  
  if (!fs.existsSync(outDir)) {
    console.error('❌ out 目錄不存在');
    return;
  }
  
  // 處理所有 HTML 檔案
  function processHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        processHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        fixHtmlFile(filePath);
      }
    });
  }
  
  function fixHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    console.log(`處理檔案: ${path.relative(outDir, filePath)}`);
    
               // 修正所有可能的 /_next/static/ 路徑
           const originalContent = content;

           // 修正 href 屬性中的路徑
           content = content.replace(
             /href="\/_next\/static\//g,
             'href="./static/'
           );

           // 修正 src 屬性中的路徑
           content = content.replace(
             /src="\/_next\/static\//g,
             'src="./static/'
           );

           // 修正 JavaScript 字串中的路徑（雙引號）
           content = content.replace(
             /"\/_next\/static\//g,
             '"./static/'
           );

           // 修正 JavaScript 字串中的路徑（單引號）
           content = content.replace(
             /'\/_next\/static\//g,
             "'./static/"
           );

           // 修正 JavaScript 字串中的路徑（模板字串）
           content = content.replace(
             /`\/_next\/static\//g,
             '`./static/'
           );

           // 修正其他可能的 Next.js 路徑
           content = content.replace(
             /\/_next\//g,
             './static/'
           );

           // 修正 __NEXT_DATA__ 中的路徑
           content = content.replace(
             /"\/_next\//g,
             '"./static/'
           );
    
    // 檢查是否有修改
    if (content !== originalContent) {
      modified = true;
      console.log(`✅ 修正了 ${path.relative(outDir, filePath)}`);
    }
    
    // 寫回檔案
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  // 處理所有 JavaScript 檔案
  function processJsFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        processJsFiles(filePath);
      } else if (file.endsWith('.js')) {
        fixJsFile(filePath);
      }
    });
  }
  
  function fixJsFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const originalContent = content;
    
    // 修正 JavaScript 檔案中的路徑
    content = content.replace(
      /"\/_next\/static\//g,
      '"./static/'
    );
    
    content = content.replace(
      /'\/_next\/static\//g,
      "'./static/"
    );
    
    content = content.replace(
      /`\/_next\/static\//g,
      '`./static/'
    );
    
    content = content.replace(
      /\/_next\//g,
      './static/'
    );
    
    if (content !== originalContent) {
      modified = true;
      console.log(`✅ 修正了 JS 檔案: ${path.relative(outDir, filePath)}`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  // 執行修正
  processHtmlFiles(outDir);
  
  // 處理 static 目錄中的 JavaScript 檔案
  const staticDir = path.join(outDir, 'static');
  if (fs.existsSync(staticDir)) {
    processJsFiles(staticDir);
  }
  
  console.log('✅ 路徑修正完成');
  
  // 驗證修正結果
  console.log('\n🔍 驗證修正結果...');
  const indexPath = path.join(outDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    if (content.includes('./static/')) {
      console.log('✅ index.html 包含正確的靜態檔案路徑');
    } else if (content.includes('/_next/static/')) {
      console.log('❌ index.html 仍包含 /_next/static/ 路徑');
    } else {
      console.log('❓ index.html 路徑格式未知');
    }
    
    // 顯示修正後的內容片段
    const lines = content.split('\n');
    const scriptLines = lines.filter(line => line.includes('script') && line.includes('src'));
    if (scriptLines.length > 0) {
      console.log('📄 修正後的 script 標籤範例:');
      scriptLines.slice(0, 3).forEach(line => {
        console.log(`   ${line.trim()}`);
      });
    }
  }
}

// 執行修正
fixPathsComplete();
