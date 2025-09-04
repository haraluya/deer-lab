#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

async function copyBuildFiles() {
  try {
    console.log('🚀 開始複製建構檔案到 functions 資料夾...');
    
    // 檢查 .next 資料夾是否存在
    const nextPath = path.join(process.cwd(), '.next');
    if (!fs.existsSync(nextPath)) {
      throw new Error('❌ .next 資料夾不存在！請先執行 npm run build');
    }
    
    const functionsPath = path.join(process.cwd(), 'functions');
    
    // 建立 functions 資料夾（如果不存在）
    if (!fs.existsSync(functionsPath)) {
      fs.mkdirSync(functionsPath, { recursive: true });
    }
    
    // 使用系統指令複製檔案（跨平台）
    const isWindows = process.platform === 'win32';
    
    // 複製 .next 資料夾
    console.log('📁 複製 .next 資料夾...');
    const functionsNextPath = path.join(functionsPath, '.next');
    
    // 先刪除舊的 .next 資料夾
    if (fs.existsSync(functionsNextPath)) {
      if (isWindows) {
        execSync(`rmdir /s /q "${functionsNextPath}"`);
      } else {
        execSync(`rm -rf "${functionsNextPath}"`);
      }
    }
    
    // 複製 .next 資料夾
    if (isWindows) {
      execSync(`xcopy "${nextPath}" "${functionsNextPath}" /E /I /Y /Q`);
    } else {
      execSync(`cp -r "${nextPath}" "${functionsNextPath}"`);
    }
    
    // 複製 package.json
    console.log('📄 複製 package.json...');
    const mainPackageJson = path.join(process.cwd(), 'package.json');
    const functionsPackageJsonBackup = path.join(functionsPath, 'package-main.json');
    
    if (isWindows) {
      execSync(`copy "${mainPackageJson}" "${functionsPackageJsonBackup}" /Y`);
    } else {
      execSync(`cp "${mainPackageJson}" "${functionsPackageJsonBackup}"`);
    }
    
    // 複製 public 資料夾
    console.log('🖼️  複製 public 資料夾...');
    const publicPath = path.join(process.cwd(), 'public');
    const functionsPublicPath = path.join(functionsPath, 'public');
    
    if (fs.existsSync(publicPath)) {
      // 先刪除舊的 public 資料夾
      if (fs.existsSync(functionsPublicPath)) {
        if (isWindows) {
          execSync(`rmdir /s /q "${functionsPublicPath}"`);
        } else {
          execSync(`rm -rf "${functionsPublicPath}"`);
        }
      }
      
      // 複製 public 資料夾
      if (isWindows) {
        execSync(`xcopy "${publicPath}" "${functionsPublicPath}" /E /I /Y /Q`);
      } else {
        execSync(`cp -r "${publicPath}" "${functionsPublicPath}"`);
      }
    }
    
    console.log('✅ 建構檔案複製完成！');
    
    // 顯示檔案大小統計
    if (fs.existsSync(functionsNextPath)) {
      console.log(`📊 檔案複製成功：`);
      console.log(`   ✓ .next 資料夾已複製到 functions/.next`);
      console.log(`   ✓ package.json 已備份為 functions/package-main.json`);
      console.log(`   ✓ public 資料夾已複製到 functions/public`);
    }
    
  } catch (error) {
    console.error('❌ 複製建構檔案時發生錯誤:', error.message);
    process.exit(1);
  }
}

// 如果直接執行這個腳本
if (require.main === module) {
  copyBuildFiles();
}

module.exports = copyBuildFiles;