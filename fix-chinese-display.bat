@echo off
REM 修正終端中文顯示問題的批次檔
echo 正在設定中文顯示環境...

REM 設定UTF-8代碼頁
chcp 65001 >nul

REM 設定環境變數
set LC_ALL=zh_TW.UTF-8
set LANG=zh_TW.UTF-8
set PYTHONIOENCODING=utf-8

REM 使用PowerShell設定輸出編碼
powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8"

echo 中文顯示環境設定完成！
echo 測試中文顯示：鹿鹿小作坊系統
echo.
echo 使用方法：
echo 1. 執行此批次檔：fix-chinese-display.bat
echo 2. 或者手動執行：powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001"
echo.
pause