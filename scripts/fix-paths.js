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
    
    // 修正所有可能的 /_next/static/ 路徑為 ./static/
const patterns = [
  // 修正 href 屬性中的路徑
  { from: /href="\/_next\/static\//g, to: 'href="./static/' },
  // 修正 src 屬性中的路徑
  { from: /src="\/_next\/static\//g, to: 'src="./static/' },
  // 修正 JavaScript 字串中的路徑（雙引號）
  { from: /"\/_next\/static\//g, to: '"./static/' },
  // 修正 JavaScript 字串中的路徑（單引號）
  { from: /'\/_next\/static\//g, to: "'./static/" },
  // 修正 JavaScript 字串中的路徑（模板字串）
  { from: /`\/_next\/static\//g, to: '`./static/' },
  // 修正 JavaScript 字串中的路徑（沒有引號）
  { from: /\/_next\/static\//g, to: './static/' },
  // 修正 JavaScript 中的路徑（在字串中）
  { from: /\/_next\/static\//g, to: './static/' }
];

// 修正 Next.js 路由相關的路徑
const nextPatterns = [
  // 修正 __NEXT_DATA__ 中的路徑
  { from: /"\/_next\//g, to: '"./static/' },
  // 修正其他可能的 Next.js 路徑
  { from: /\/_next\//g, to: './static/' }
];
    
    // 應用所有修正模式
    patterns.forEach(pattern => {
      content = content.replace(pattern.from, pattern.to);
    });
    
    // 應用 Next.js 路由修正模式
    nextPatterns.forEach(pattern => {
      content = content.replace(pattern.from, pattern.to);
    });
    
    // 寫回檔案
    fs.writeFileSync(filePath, content);
    console.log(`已修正 ${file} 的路徑`);
  });
  
  console.log('所有HTML檔案的路徑修正完成！');
}

// 執行修正
fixPaths();
