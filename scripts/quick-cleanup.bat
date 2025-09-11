@echo off
echo 🧹 Google Cloud Functions 原始碼清理工具
echo.

REM 檢查是否已安裝必要的套件
echo 📦 檢查相依套件...
npm list @google-cloud/storage >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未找到 @google-cloud/storage，正在安裝...
    npm install @google-cloud/storage
    if %errorlevel% neq 0 (
        echo ❌ 安裝失敗，請手動執行: npm install @google-cloud/storage
        pause
        exit /b 1
    )
)

echo ✅ 套件檢查完成
echo.

REM 檢查 Google Cloud 認證
echo 🔐 檢查 Google Cloud 認證...
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  需要先登入 Google Cloud
    echo 執行中: gcloud auth login
    gcloud auth login
    if %errorlevel% neq 0 (
        echo ❌ 登入失敗
        pause
        exit /b 1
    )
)

echo ✅ 認證檢查完成
echo.

REM 執行清理腳本
echo 🚀 執行清理腳本 (乾跑模式)...
echo.
node cleanup-gcs-functions.js

echo.
echo 💡 這是乾跑模式的結果。若要實際刪除檔案：
echo    1. 編輯 cleanup-gcs-functions.js
echo    2. 將 dryRun: true 改為 dryRun: false
echo    3. 重新執行此腳本
echo.
pause