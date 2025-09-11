@echo off
chcp 65001 >nul
echo ====================================
echo 🦌 鹿鹿小作坊備份恢復工具
echo ====================================
echo.

if "%1"=="" (
    echo ❌ 請提供備份資料夾路径
    echo 使用方式：restore-from-backup.bat "備份資料夾路径"
    echo 範例：restore-from-backup.bat "D:\APP\deer-lab-backups\deer-lab-backup_2025-09-11_22-30-00"
    echo.
    pause
    exit /b 1
)

set "backup_path=%~1"
if not exist "%backup_path%" (
    echo ❌ 備份資料夾不存在：%backup_path%
    pause
    exit /b 1
)

echo 📁 備份位置：%backup_path%
echo.
echo ⚠️ 警告：此操作將覆蓋當前專案檔案
set /p confirm=確定要恢復嗎？(Y/N): 
if /i not "%confirm%"=="Y" (
    echo 已取消恢復操作
    pause
    exit /b 0
)

echo.
echo 🔄 開始恢復...

:: 1. 恢復原始碼
echo [1/4] 📦 恢復程式碼...
if exist "%backup_path%\source" (
    robocopy "%backup_path%\source" "D:\APP\deer-lab" /E /XD node_modules .git /NFL /NDL /NJH /NJS /nc /ns /np
    if errorlevel 1 if not errorlevel 8 (
        echo ❌ 程式碼恢復失敗
        pause
        exit /b 1
    )
) else (
    echo ❌ 備份中沒有找到程式碼
    pause
    exit /b 1
)

:: 2. 恢復 Firebase 設定
echo [2/4] ⚙️ 恢復 Firebase 設定...
if exist "%backup_path%\firebase_config" (
    copy "%backup_path%\firebase_config\*" "D:\APP\deer-lab\" >nul 2>&1
)

:: 3. 安裝依賴
echo [3/4] 📦 安裝依賴套件...
cd "D:\APP\deer-lab"
call npm install >nul 2>&1
if errorlevel 1 (
    echo ❌ 依賴安裝失敗
    pause
    exit /b 1
)

cd functions
call npm install >nul 2>&1
if errorlevel 1 (
    echo ❌ Functions 依賴安裝失敗
    pause
    exit /b 1
)
cd ..

:: 4. 恢復建構產物（如果有的話）
echo [4/4] 🔧 恢復建構產物...
if exist "%backup_path%\build\.next" (
    robocopy "%backup_path%\build\.next" "D:\APP\deer-lab\.next" /E /NFL /NDL /NJH /NJS /nc /ns /np
    robocopy "D:\APP\deer-lab\.next" "D:\APP\deer-lab\functions\.next" /E /NFL /NDL /NJH /NJS /nc /ns /np
) else (
    echo 📦 重新建構專案...
    call npm run build >nul 2>&1
    if errorlevel 1 (
        echo ❌ 建構失敗
        pause
        exit /b 1
    )
    robocopy "D:\APP\deer-lab\.next" "D:\APP\deer-lab\functions\.next" /E /NFL /NDL /NJH /NJS /nc /ns /np
)

echo.
echo ✅ 恢復完成！
echo.
echo 🚀 現在可以執行：
echo    firebase deploy --only functions:nextServer
echo.
pause