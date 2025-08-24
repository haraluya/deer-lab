// scripts/check-environment-differences.js
const fs = require('fs');
const path = require('path');

console.log('🔍 檢查本地和 Firebase 部署的環境差異...\n');

// 1. 檢查 Firebase 配置
console.log('1. 🔥 Firebase 配置檢查');
console.log('='.repeat(50));

const firebaseConfig = {
  apiKey: "AIzaSyCMIAqNPsIyl3fJNllqNCuUJE2Rvcdf6fk",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.firebasestorage.app",
  messagingSenderId: "554942047858",
  appId: "1:554942047858:web:607d3e27bb438c898644eb"
};

console.log('✅ Firebase 配置已硬編碼，不會有環境差異');
console.log(`   Project ID: ${firebaseConfig.projectId}`);
console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);

// 2. 檢查環境變數
console.log('\n2. 🌍 環境變數檢查');
console.log('='.repeat(50));

const envFiles = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production'
];

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`⚠️  發現環境變數檔案: ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    lines.forEach(line => {
      console.log(`   ${line}`);
    });
  } else {
    console.log(`✅ 無環境變數檔案: ${file}`);
  }
});

// 3. 檢查 Next.js 配置
console.log('\n3. ⚙️ Next.js 配置檢查');
console.log('='.repeat(50));

const nextConfig = require('../next.config.mts');
console.log('✅ Next.js 配置:');
console.log(`   output: ${nextConfig.output}`);
console.log(`   trailingSlash: ${nextConfig.trailingSlash}`);
console.log(`   basePath: ${nextConfig.basePath}`);
console.log(`   assetPrefix: ${nextConfig.assetPrefix}`);

// 4. 檢查 Firebase Hosting 配置
console.log('\n4. 🏠 Firebase Hosting 配置檢查');
console.log('='.repeat(50));

const firebaseJson = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
console.log('✅ Firebase Hosting 配置:');
console.log(`   public: ${firebaseJson.hosting.public}`);
console.log(`   rewrites: ${firebaseJson.hosting.rewrites.length} 個規則`);
console.log(`   headers: ${firebaseJson.hosting.headers.length} 個標頭`);

// 5. 檢查建置輸出
console.log('\n5. 📦 建置輸出檢查');
console.log('='.repeat(50));

const outDir = 'out';
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir);
  console.log(`✅ 建置輸出目錄存在，包含 ${files.length} 個檔案/目錄`);
  
  // 檢查關鍵檔案
  const keyFiles = ['index.html', 'dashboard.html', 'static'];
  keyFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} 存在`);
    } else {
      console.log(`   ❌ ${file} 不存在`);
    }
  });
  
  // 檢查 static 目錄
  const staticDir = path.join(outDir, 'static');
  if (fs.existsSync(staticDir)) {
    const staticFiles = fs.readdirSync(staticDir);
    console.log(`   📁 static 目錄包含: ${staticFiles.join(', ')}`);
  }
} else {
  console.log('❌ 建置輸出目錄不存在，請先執行 npm run build-static');
}

// 6. 檢查依賴項
console.log('\n6. 📚 依賴項檢查');
console.log('='.repeat(50));

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('✅ 主要依賴項:');
console.log(`   Next.js: ${packageJson.dependencies.next}`);
console.log(`   React: ${packageJson.dependencies.react}`);
console.log(`   Firebase: ${packageJson.dependencies.firebase}`);

// 7. 檢查可能的問題
console.log('\n7. ⚠️ 潛在問題檢查');
console.log('='.repeat(50));

const potentialIssues = [];

// 檢查是否有環境變數依賴
if (envFiles.some(file => fs.existsSync(file))) {
  potentialIssues.push('發現環境變數檔案，可能導致本地和部署環境差異');
}

// 檢查 Firebase 配置是否硬編碼
if (fs.existsSync('src/lib/firebase.ts')) {
  const firebaseContent = fs.readFileSync('src/lib/firebase.ts', 'utf8');
  if (firebaseContent.includes('process.env')) {
    potentialIssues.push('Firebase 配置使用環境變數，可能導致部署問題');
  } else {
    console.log('✅ Firebase 配置已硬編碼，不會有環境差異');
  }
}

// 檢查是否有動態導入
const srcDir = 'src';
function checkDynamicImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      checkDynamicImports(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('dynamic(') || content.includes('import(')) {
        potentialIssues.push(`發現動態導入: ${fullPath}`);
      }
    }
  });
}

if (fs.existsSync(srcDir)) {
  checkDynamicImports(srcDir);
}

// 檢查是否有服務端組件在客戶端使用
const clientComponents = [];
function checkClientComponents(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      checkClientComponents(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("'use client'")) {
        clientComponents.push(fullPath);
      }
    }
  });
}

if (fs.existsSync(srcDir)) {
  checkClientComponents(srcDir);
}

console.log(`✅ 發現 ${clientComponents.length} 個客戶端組件`);

// 8. 總結
console.log('\n8. 📋 總結');
console.log('='.repeat(50));

if (potentialIssues.length > 0) {
  console.log('⚠️ 發現潛在問題:');
  potentialIssues.forEach(issue => {
    console.log(`   - ${issue}`);
  });
} else {
  console.log('✅ 未發現明顯的環境差異問題');
}

console.log('\n🔧 建議檢查項目:');
console.log('1. 確認 Google Cloud API 已啟用');
console.log('2. 檢查 Firebase Authentication 設定');
console.log('3. 確認 Firestore 資料庫和規則');
console.log('4. 檢查瀏覽器控制台錯誤');
console.log('5. 確認網路連線和防火牆設定');

console.log('\n📝 測試步驟:');
console.log('1. 本地測試: npm run dev');
console.log('2. 建置測試: npm run build-static');
console.log('3. 部署測試: firebase deploy --only hosting');
console.log('4. 線上測試: https://deer-lab.web.app');
