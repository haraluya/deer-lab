const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'out');

console.log('🔧 徹底修正所有路徑問題...');

function fixHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  console.log(`處理檔案: ${path.relative(outDir, filePath)}`);

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

  // 修正 manifest 路徑 - 使用相對路徑
  content = content.replace(
    /href="\/manifest\.json"/g,
    'href="./manifest.json"'
  );

  // 修正圖示路徑 - 使用相對路徑
  content = content.replace(
    /href="\/icon-192x192\.png"/g,
    'href="./icon-192x192.png"'
  );

  // 修正 favicon 路徑 - 使用相對路徑
  content = content.replace(
    /href="\/favicon\.ico"/g,
    'href="./favicon.ico"'
  );

  // 修正 apple-touch-icon 路徑
  content = content.replace(
    /href="\/icon-192x192\.png"/g,
    'href="./icon-192x192.png"'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 修正了 ${path.relative(outDir, filePath)}`);
    modified = true;
  }

  return modified;
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

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 修正了 JS 檔案: ${path.relative(outDir, filePath)}`);
    modified = true;
  }

  return modified;
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.endsWith('.html')) {
      fixHtmlFile(fullPath);
    } else if (item.endsWith('.js')) {
      fixJsFile(fullPath);
    }
  }
}

// 處理所有檔案
processDirectory(outDir);

console.log('✅ 路徑修正完成');

// 驗證修正結果
console.log('\n🔍 驗證修正結果...');
const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');

if (indexHtml.includes('./static/')) {
  console.log('✅ index.html 包含正確的靜態檔案路徑');
  
  // 顯示修正後的 script 標籤範例
  const scriptMatch = indexHtml.match(/<script[^>]+src="[^"]*"[^>]*>/);
  if (scriptMatch) {
    console.log('📄 修正後的 script 標籤範例:');
    console.log('   ' + scriptMatch[0].substring(0, 100) + '...');
  }
} else {
  console.log('❌ index.html 路徑修正失敗');
}
