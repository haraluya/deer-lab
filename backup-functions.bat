@echo off
chcp 65001 >nul
echo ====================================
echo 🦌 鹿鹿小作坊手動備份工具
echo ====================================
echo.

:: 獲取當前時間戳
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "NN=%dt:~10,2%" & set "SS=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%_%HH%-%NN%-%SS%"

:: 設定備份資料夾名稱
set "backup_name=deer-lab-backup_%datestamp%"
set "backup_path=D:\APP\deer-lab-backups\%backup_name%"

echo 📅 建立時間：%YYYY%-%MM%-%DD% %HH%:%NN%:%SS%
echo 📁 備份位置：%backup_path%
echo.

:: 建立備份目錄
if not exist "D:\APP\deer-lab-backups" mkdir "D:\APP\deer-lab-backups"
mkdir "%backup_path%"

echo 🔄 開始備份...
echo.

:: 1. 備份程式碼（排除不必要的檔案）
echo [1/4] 📦 備份程式碼...
robocopy "D:\APP\deer-lab" "%backup_path%\source" /E /XD node_modules .git .next functions\.next /XF *.log npm-debug.log* /NFL /NDL /NJH /NJS /nc /ns /np
if errorlevel 1 if not errorlevel 8 (
    echo ❌ 程式碼備份失敗
    exit /b 1
)

:: 2. 備份 Firebase 設定
echo [2/4] ⚙️ 備份 Firebase 設定...
copy "D:\APP\deer-lab\.firebaserc" "%backup_path%\firebase_config\" >nul 2>&1
copy "D:\APP\deer-lab\firebase.json" "%backup_path%\firebase_config\" >nul 2>&1

:: 3. 建構並備份部署檔案
echo [3/4] 🔧 建構專案...
cd "D:\APP\deer-lab"
call npm run build >nul 2>&1
if errorlevel 1 (
    echo ❌ 建構失敗，請檢查程式碼
    exit /b 1
)

:: 備份建構產物
echo [3/4] 📊 備份建構產物...
robocopy "D:\APP\deer-lab\.next" "%backup_path%\build\.next" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "D:\APP\deer-lab\functions" "%backup_path%\build\functions" /E /XD node_modules /NFL /NDL /NJH /NJS /nc /ns /np

:: 4. 建立備份資訊檔
echo [4/4] 📄 建立備份資訊...
(
echo 鹿鹿小作坊手動備份資訊
echo ========================
echo 備份時間：%YYYY%-%MM%-%DD% %HH%:%NN%:%SS%
echo Git 提交：
git log -1 --oneline 2>nul
echo.
echo Firebase 專案：
type .firebaserc 2>nul
echo.
echo 備份內容：
echo - 完整原始碼 ^(排除 node_modules, .git, .next^)
echo - Firebase 設定檔
echo - 建構產物 ^(.next, functions^)
echo.
echo 恢復方式：
echo 1. 複製 source 資料夾內容到專案目錄
echo 2. 執行 npm install
echo 3. 複製 build 資料夾到專案目錄
echo 4. 執行 firebase deploy
) > "%backup_path%\備份說明.txt"

echo.
echo ✅ 備份完成！
echo 📁 備份位置：%backup_path%
echo 📊 備份大小：
for /f %%A in ('powershell -command "(Get-ChildItem '%backup_path%' -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB"') do echo    約 %%A MB
echo.
pause