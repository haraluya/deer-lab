// scripts/fix-auth-wrapper.js
const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '..', 'src', 'app', 'dashboard');

function fixAuthWrapper(filePath) {
  console.log(`🔧 修復檔案: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 移除 AuthWrapper import
  if (content.includes("import { AuthWrapper } from '@/components/AuthWrapper'")) {
    content = content.replace(/import \{ AuthWrapper \} from '@\/components\/AuthWrapper';?\n?/g, '');
    modified = true;
    console.log('  ✅ 移除 AuthWrapper import');
  }
  
  // 移除 AuthWrapper 組件包裝
  if (content.includes('<AuthWrapper>')) {
    content = content.replace(/<AuthWrapper>\s*([\s\S]*?)\s*<\/AuthWrapper>/g, '$1');
    modified = true;
    console.log('  ✅ 移除 AuthWrapper 組件包裝');
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✅ 檔案已更新');
  } else {
    console.log('  ⏭️ 無需修改');
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixAuthWrapper(filePath);
    }
  });
}

console.log('🔧 開始修復 AuthWrapper 問題...');
processDirectory(dashboardDir);
console.log('✅ 修復完成！');
