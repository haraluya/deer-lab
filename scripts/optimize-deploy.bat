@echo off
echo ===========================================
echo        德科斯特的實驗室 - 優化部署腳本
echo ===========================================
echo.

echo [1/6] 清理本地建構快取...
if exist .next\cache rmdir /s /q .next\cache
if exist functions\.next\cache rmdir /s /q functions\.next\cache

echo [2/6] 建構 Next.js 專案...
call npm run build
if errorlevel 1 (
    echo 建構失敗！
    exit /b 1
)

echo [3/6] 清理 functions/.next 的快取目錄...
if exist functions\.next\cache rmdir /s /q functions\.next\cache

echo [4/6] 同步優化的建構產物...
echo 複製 .next 到 functions/（排除快取）...
xcopy .next functions\.next /E /I /H /Y /exclude:scripts\exclude-cache.txt

echo [5/6] 編譯 Functions...
cd functions
call npm run build
if errorlevel 1 (
    echo Functions 編譯失敗！
    cd ..
    exit /b 1
)
cd ..

echo [6/6] 顯示最終大小統計...
echo.
echo === 部署包大小分析 ===
for /f %%i in ('dir functions /s /-c ^| find "個檔案"') do echo Functions 總大小: %%i
for /f %%i in ('dir functions\.next /s /-c ^| find "個檔案"') do echo .next 大小: %%i

echo.
echo ✅ 優化完成！準備部署...
echo.
echo 執行部署指令：
echo firebase deploy --only functions:nextServer
echo.
pause