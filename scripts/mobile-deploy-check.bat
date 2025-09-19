@echo off
:: 行動裝置優化部署檢查批次檔
:: 建立時間：2025-09-19

echo.
echo ========================================
echo    德科斯特實驗室 - 行動裝置優化部署
echo ========================================
echo.

:: 檢查 Node.js 是否安裝
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 未找到 Node.js，請先安裝 Node.js
    pause
    exit /b 1
)

:: 檢查 npm 是否安裝
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 未找到 npm，請檢查 Node.js 安裝
    pause
    exit /b 1
)

:: 檢查 Firebase CLI 是否安裝
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  警告: 未找到 Firebase CLI
    echo    如需部署，請執行: npm install -g firebase-tools
    echo.
)

echo 🔍 開始執行部署檢查...
echo.

:: 執行部署檢查腳本
node scripts\mobile-optimization-deployment.js %*

:: 檢查執行結果
if errorlevel 1 (
    echo.
    echo ❌ 部署檢查失敗！請查看上方錯誤訊息
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ 部署檢查完成！
    echo.

    :: 詢問是否執行實際部署
    set /p DEPLOY_CHOICE="是否執行實際部署到 Firebase？(y/N): "

    if /i "%DEPLOY_CHOICE%"=="y" (
        echo.
        echo 🚀 開始部署...
        node scripts\mobile-optimization-deployment.js --deploy

        if errorlevel 1 (
            echo.
            echo ❌ 部署失敗！
            pause
            exit /b 1
        ) else (
            echo.
            echo 🎉 部署成功完成！
            echo.
        )
    ) else (
        echo.
        echo ℹ️  已跳過部署，僅執行檢查
        echo.
    )
)

echo 📋 檢查報告已儲存至 deployment-report.json
echo.

pause