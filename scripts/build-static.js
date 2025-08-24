const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 建置靜態檔案
function buildStatic() {
  console.log('🔨 開始建置靜態檔案...');
  
  // 清理舊的建置
  console.log('🧹 清理舊的建置...');
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }
  if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true, force: true });
  }
  
  // 執行 Next.js 建置
  console.log('📦 執行 Next.js 建置...');
  try {
    execSync('npx next build', { stdio: 'inherit' });
    console.log('✅ Next.js 建置完成');
  } catch (error) {
    console.error('❌ Next.js 建置失敗');
    process.exit(1);
  }
  
  // 創建 out 目錄
  if (!fs.existsSync('out')) {
    fs.mkdirSync('out', { recursive: true });
  }
  
  // 複製靜態檔案
  console.log('📁 複製靜態檔案...');
  if (fs.existsSync('.next/static')) {
    fs.cpSync('.next/static', 'out/static', { recursive: true });
    console.log('✅ 靜態檔案複製完成');
  }
  
  // 複製 public 檔案
  if (fs.existsSync('public')) {
    const publicFiles = fs.readdirSync('public');
    publicFiles.forEach(file => {
      const sourcePath = path.join('public', file);
      const targetPath = path.join('out', file);
      if (fs.statSync(sourcePath).isDirectory()) {
        fs.cpSync(sourcePath, targetPath, { recursive: true });
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
    console.log('✅ public 檔案複製完成');
  }
  
  // 複製 Next.js 生成的 HTML 檔案
  console.log('📄 複製 HTML 檔案...');
  if (fs.existsSync('.next/server/app')) {
    copyHtmlFiles('.next/server/app', 'out');
  }
  
  // 確保基本頁面存在
  ensureBasicPages();
  
  console.log('✅ 靜態建置完成！');
}

// 遞迴複製 HTML 檔案
function copyHtmlFiles(sourceDir, targetDir) {
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // 創建目標目錄
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyHtmlFiles(sourcePath, targetPath);
    } else if (file.endsWith('.html')) {
      // 複製 HTML 檔案
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ 複製: ${path.relative('.next/server/app', sourcePath)}`);
    }
  });
}

// 確保基本頁面存在
function ensureBasicPages() {
  const requiredPages = [
    { path: 'out/index.html', source: '.next/server/app/index.html' },
    { path: 'out/dashboard.html', source: '.next/server/app/dashboard.html' }
  ];
  
  requiredPages.forEach(page => {
    if (!fs.existsSync(page.path) && fs.existsSync(page.source)) {
      fs.copyFileSync(page.source, page.path);
      console.log(`✅ 確保 ${path.basename(page.path)} 存在`);
    }
  });
}

// 執行建置
buildStatic();
