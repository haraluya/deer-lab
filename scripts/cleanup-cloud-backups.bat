@echo off
echo ====================================
echo 🚫 Google Cloud 備份清理腳本
echo ====================================
echo.

echo 📋 步驟 1: 清理 Functions 原始碼備份
echo 正在清理 gcf-v2-sources bucket...
gcloud storage rm -r gs://gcf-v2-sources-554942047858-us-central1/** 2>nul
echo ✅ 原始碼備份已清理

echo.
echo 📋 步驟 2: 清理 Functions 上傳備份
echo 正在清理 gcf-v2-uploads bucket (這可能需要一些時間)...
gcloud storage rm -r gs://gcf-v2-uploads-554942047858.us-central1.cloudfunctions.appspot.com/** 2>nul
echo ✅ 上傳備份已清理

echo.
echo 📋 步驟 3: 設定生命週期政策自動清理
echo 正在設定 1 天自動刪除政策...

:: 創建生命週期配置檔案
echo { > lifecycle.json
echo   "lifecycle": { >> lifecycle.json
echo     "rule": [ >> lifecycle.json
echo       { >> lifecycle.json
echo         "action": {"type": "Delete"}, >> lifecycle.json
echo         "condition": {"age": 1} >> lifecycle.json
echo       } >> lifecycle.json
echo     ] >> lifecycle.json
echo   } >> lifecycle.json
echo } >> lifecycle.json

:: 應用生命週期政策
gcloud storage buckets update gs://gcf-v2-sources-554942047858-us-central1 --lifecycle-file=lifecycle.json
gcloud storage buckets update gs://gcf-v2-uploads-554942047858.us-central1.cloudfunctions.appspot.com --lifecycle-file=lifecycle.json

:: 清理暫存檔案
del lifecycle.json

echo ✅ 生命週期政策已設定

echo.
echo 📋 步驟 4: 檢查最終大小
echo.
echo 原始碼備份大小:
gcloud storage du gs://gcf-v2-sources-554942047858-us-central1/ --summarize
echo.
echo 上傳備份大小:
gcloud storage du gs://gcf-v2-uploads-554942047858.us-central1.cloudfunctions.appspot.com/ --summarize

echo.
echo ====================================
echo ✅ 備份清理完成！
echo 💰 節省儲存空間費用
echo 🔄 已設定自動清理政策（每天自動刪除）
echo ====================================
pause