// scripts/remove-permissions.js
const fs = require('fs');
const path = require('path');

// 要處理的檔案列表
const files = [
  'src/app/dashboard/materials/page.tsx',
  'src/app/dashboard/products/page.tsx',
  'src/app/dashboard/suppliers/page.tsx',
  'src/app/dashboard/roles/page.tsx',
  'src/app/dashboard/fragrances/page.tsx',
  'src/app/dashboard/product-series/page.tsx',
  'src/app/dashboard/purchase-orders/page.tsx',
  'src/app/dashboard/work-orders/page.tsx',
  'src/app/dashboard/inventory/page.tsx'
];

// 權限檢查模式
const permissionPatterns = [
  {
    pattern: /disabled=\{!canManage[A-Za-z]+\(\)\}/g,
    replacement: 'disabled={false}'
  },
  {
    pattern: /disabled=\{isSubmitting \|\| !canManage[A-Za-z]+\(\)\}/g,
    replacement: 'disabled={isSubmitting}'
  },
  {
    pattern: /className=\{`[^`]*\$\{!canManage[A-Za-z]+\(\) \? '[^']*' : '[^']*'\}[^`]*`\}/g,
    replacement: (match) => {
      // 提取原始的 className 部分，移除權限相關的條件
      const baseClass = match.replace(/\$\{!canManage[A-Za-z]+\(\) \? '[^']*' : '[^']*'\}/g, '');
      return baseClass.replace(/`/g, '').trim();
    }
  },
  {
    pattern: /\{canManage[A-Za-z]+\(\) \? '[^']*' : '[^']*'\}/g,
    replacement: (match) => {
      // 提取第一個選項（權限足夠時的文字）
      const firstOption = match.match(/\? '([^']*)'/);
      return firstOption ? `'${firstOption[1]}'` : match;
    }
  }
];

function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  檔案不存在: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = 0;

    // 應用所有權限檢查模式
    permissionPatterns.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changes += matches.length;
      }
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已處理 ${filePath} (${changes} 個變更)`);
    } else {
      console.log(`ℹ️  無變更: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 處理檔案失敗 ${filePath}:`, error.message);
  }
}

// 主執行函數
function main() {
  console.log('🔧 開始移除權限檢查...');
  
  files.forEach(file => {
    processFile(file);
  });
  
  console.log('🎉 權限檢查移除完成！');
}

main();
