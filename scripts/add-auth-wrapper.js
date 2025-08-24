const fs = require('fs');
const path = require('path');

// 需要添加 AuthWrapper 的頁面列表
const pages = [
  'material-categories',
  'roles',
  'cost-management',
  'test',
  'work-orders',
  'reports',
  'inventory',
  'production-calculator',
  'materials',
  'products',
  'product-series',
  'fragrances',
  'suppliers'
];

function addAuthWrapper(pageName) {
  const pagePath = path.join(__dirname, '..', 'src', 'app', 'dashboard', pageName, 'page.tsx');
  
  if (!fs.existsSync(pagePath)) {
    console.log(`❌ 頁面不存在: ${pagePath}`);
    return;
  }

  let content = fs.readFileSync(pagePath, 'utf8');
  
  // 檢查是否已經有 AuthWrapper
  if (content.includes('AuthWrapper')) {
    console.log(`✅ ${pageName} 已經有 AuthWrapper`);
    return;
  }

  // 添加 AuthWrapper 導入
  if (content.includes("import { db } from '@/lib/firebase';")) {
    content = content.replace(
      "import { db } from '@/lib/firebase';",
      "import { db } from '@/lib/firebase';\nimport { AuthWrapper } from '@/components/AuthWrapper';"
    );
  } else if (content.includes("'use client';")) {
    // 在 'use client' 後添加導入
    content = content.replace(
      "'use client';",
      "'use client';\n\nimport { AuthWrapper } from '@/components/AuthWrapper';"
    );
  }

  // 找到 export default function
  const exportMatch = content.match(/export default function (\w+)/);
  if (!exportMatch) {
    console.log(`❌ 無法找到 export default function in ${pageName}`);
    return;
  }

  const functionName = exportMatch[1];
  const contentFunctionName = functionName + 'Content';

  // 重命名主函數
  content = content.replace(
    `export default function ${functionName}`,
    `function ${contentFunctionName}`
  );

  // 在文件末尾添加新的 export default
  content += `\n\nexport default function ${functionName}() {\n  return (\n    <AuthWrapper>\n      <${contentFunctionName} />\n    </AuthWrapper>\n  );\n}\n`;

  fs.writeFileSync(pagePath, content);
  console.log(`✅ 已為 ${pageName} 添加 AuthWrapper`);
}

console.log('🔧 開始為所有頁面添加 AuthWrapper...\n');

pages.forEach(page => {
  addAuthWrapper(page);
});

console.log('\n✅ 完成！');
