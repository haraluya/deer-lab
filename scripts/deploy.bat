@echo off
echo 🚀 開始部署 Deer Lab 生產管理系統...

REM 檢查是否在正確的目錄
if not exist "package.json" (
    echo ❌ 錯誤: 請在專案根目錄執行此腳本
    exit /b 1
)

REM 清理舊的建置
echo 🧹 清理舊的建置...
if exist ".next" rmdir /s /q ".next"
if exist "out" rmdir /s /q "out"

REM 安裝依賴
echo 📦 安裝依賴...
call npm install

REM 建置專案
echo 🔨 建置專案...
call npm run build-static

REM 檢查建置結果
if not exist "out\index.html" (
    echo ❌ 建置失敗: index.html 不存在
    exit /b 1
)

if not exist "out\static" (
    echo ❌ 建置失敗: static 目錄不存在
    exit /b 1
)

echo ✅ 建置完成

REM 部署到 Firebase
echo 🌐 部署到 Firebase...
call firebase deploy --only hosting

echo ✅ 部署完成！
echo 🌍 您的應用程式已部署到: https://deer-lab.web.app
