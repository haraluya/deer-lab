const fs = require('fs');
const path = require('path');

// 修正靜態匯出後的HTML路徑
function fixPaths() {
  const outDir = path.join(__dirname, '..', 'out');
  
  // 檢查out目錄是否存在
  if (!fs.existsSync(outDir)) {
    console.error('out 目錄不存在，請先執行 npm run build');
    process.exit(1);
  }
  
  // 讀取所有HTML檔案
  const htmlFiles = fs.readdirSync(outDir).filter(file => file.endsWith('.html'));
  
  if (htmlFiles.length === 0) {
    console.log('沒有找到HTML檔案');
    return;
  }
  
  htmlFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 修正所有 /_next/static/ 路徑為 ./static/
    content = content.replace(
      /\/_next\/static\//g,
      './static/'
    );
    
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
    
    // 修正 JavaScript 中的路徑（在字串中）
    content = content.replace(
      /"\/_next\/static\//g,
      '"./static/'
    );
    
    // 修正 JavaScript 中的路徑（在字串中，單引號）
    content = content.replace(
      /'\/_next\/static\//g,
      "'./static/"
    );
    
    // 寫回檔案
    fs.writeFileSync(filePath, content);
    console.log(`已修正 ${file} 的路徑`);
  });
  
  console.log('所有HTML檔案的路徑修正完成！');
}

// 執行修正
fixPaths();
