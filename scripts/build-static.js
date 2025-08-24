const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 載入環境變數
function loadEnvVars() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // 移除引號
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      }
    });
    
    // 設定環境變數
    Object.keys(envVars).forEach(key => {
      process.env[key] = envVars[key];
    });
    
    console.log('✅ 環境變數已載入');
    return envVars;
  } else {
    console.log('⚠️  未找到 .env.local 檔案，使用預設配置');
    return {};
  }
}

// 建置靜態檔案
function buildStatic() {
  console.log('🔨 開始建置靜態檔案...');
  
  // 載入環境變數
  const envVars = loadEnvVars();
  
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
    // 設定生產環境變數
    const buildEnv = { ...process.env, NODE_ENV: 'production' };
    execSync('npx next build', { stdio: 'inherit', env: buildEnv });
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
  
  // 修正所有 HTML 檔案的路徑
  console.log('🔧 修正 HTML 檔案路徑...');
  fixHtmlPaths();
  
  // 驗證建置結果
  validateBuild();
  
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

// 修正 HTML 檔案中的路徑
function fixHtmlPaths() {
  const outDir = path.join(__dirname, '..', 'out');
  
  // 遞迴查找所有 HTML 檔案
  function findHtmlFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        files.push(...findHtmlFiles(fullPath));
      } else if (item.endsWith('.html')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }
  
  const htmlFiles = findHtmlFiles(outDir);
  
  htmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    
      // 修正路徑模式
  const patterns = [
    // 修正 href 屬性中的路徑
    { from: /href="\/_next\/static\//g, to: 'href="/static/' },
    // 修正 src 屬性中的路徑
    { from: /src="\/_next\/static\//g, to: 'src="/static/' },
    // 修正 JavaScript 字串中的路徑（雙引號）
    { from: /"\/_next\/static\//g, to: '"/static/' },
    // 修正 JavaScript 字串中的路徑（單引號）
    { from: /'\/_next\/static\//g, to: "'/static/" },
    // 修正 JavaScript 字串中的路徑（模板字串）
    { from: /`\/_next\/static\//g, to: '`/static/' },
    // 修正相對路徑
    { from: /href="\.\/static\//g, to: 'href="/static/' },
    { from: /src="\.\/static\//g, to: 'src="/static/' },
    // 修正字體檔案路徑
    { from: /href="\/next\/static\/media\//g, to: 'href="/static/media/' },
    { from: /src="\/next\/static\/media\//g, to: 'src="/static/media/' },
    { from: /"\/next\/static\/media\//g, to: '"/static/media/' },
    { from: /'\/next\/static\/media\//g, to: "'/static/media/" },
    { from: /`\/next\/static\/media\//g, to: '`/static/media/' },
    // 修正其他可能的 Next.js 路徑
    { from: /\/_next\//g, to: '/static/' },
    { from: /\/next\/static\//g, to: '/static/' }
  ];
    
    // 應用所有修正模式
    patterns.forEach(pattern => {
      content = content.replace(pattern.from, pattern.to);
    });
    
    // 寫回檔案
    fs.writeFileSync(filePath, content);
    console.log(`✅ 修正路徑: ${path.relative(outDir, filePath)}`);
  });
}

// 驗證建置結果
function validateBuild() {
  const outDir = path.join(__dirname, '..', 'out');
  
  // 檢查必要檔案是否存在
  const requiredFiles = [
    'index.html',
    'static/chunks',
    'static/css',
    'manifest.json'
  ];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  警告: ${file} 不存在`);
    } else {
      console.log(`✅ 驗證: ${file} 存在`);
    }
  });
  
  // 檢查 JavaScript 檔案
  const chunksDir = path.join(outDir, 'static/chunks');
  if (fs.existsSync(chunksDir)) {
    const jsFiles = fs.readdirSync(chunksDir).filter(file => file.endsWith('.js'));
    console.log(`✅ 找到 ${jsFiles.length} 個 JavaScript 檔案`);
  }
}

// 執行建置
buildStatic();
