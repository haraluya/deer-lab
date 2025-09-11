# Google Cloud Storage 函數原始碼清理指南

## 問題說明

Firebase Functions 每次部署時會自動在 Google Cloud Storage 中儲存原始碼備份（`function-source.zip`），這些檔案通常每個都有 300+MB，會快速消耗 Cloud Storage 配額並產生費用。

## 解決方案

我們提供了自動化清理腳本來刪除過舊的備份檔案，只保留最新的幾個版本。

## 使用方法

### 方法 1：快速清理（推薦）

1. 開啟命令提示字元，切換到專案目錄：
   ```cmd
   cd D:\APP\deer-lab\scripts
   ```

2. 執行快速清理腳本：
   ```cmd
   quick-cleanup.bat
   ```

3. 腳本會自動：
   - 檢查並安裝必要套件
   - 檢查 Google Cloud 認證
   - 以乾跑模式顯示清理預覽

### 方法 2：手動執行

1. 確保已安裝必要套件：
   ```cmd
   npm install @google-cloud/storage
   ```

2. 確保已登入 Google Cloud：
   ```cmd
   gcloud auth login
   ```

3. 執行清理腳本：
   ```cmd
   node cleanup-gcs-functions.js
   ```

## 清理設定

在 `cleanup-gcs-functions.js` 中可以調整以下設定：

```javascript
const CONFIG = {
  // Bucket 名稱（從 Google Cloud Console 獲取）
  bucketName: 'gcf-v2-sources-554942047858-us-central1',
  
  // 保留最新幾個版本
  keepLatestVersions: 2,
  
  // 乾跑模式（true = 只預覽，false = 實際刪除）
  dryRun: true,
  
  // 只清理大於此大小的檔案（MB）
  minFileSizeMB: 100
};
```

## 安全注意事項

1. **首次使用請保持 `dryRun: true`**，先預覽要刪除的檔案
2. **建議保留 2-3 個最新版本**，以防需要回滾
3. **定期執行**，避免檔案累積過多

## 預期效果

根據您的截圖，預估可以：
- 清理數十個 300+MB 的備份檔案
- 釋放數 GB 的 Cloud Storage 空間
- 每月節省 $0.02-0.05 USD 的儲存費用（依檔案大小而定）

## 自動化建議

可以設定定期任務（如每月執行一次）來自動清理：

1. 建立 Windows 排程工作
2. 設定執行 `quick-cleanup.bat`
3. 設定為每月第一個週日執行

## 故障排除

### 錯誤：找不到 bucket
- 檢查 bucket 名稱是否正確
- 確認專案 ID 設定正確：`gcloud config set project your-project-id`

### 錯誤：權限不足
- 確認已登入正確的 Google 帳號
- 確認帳號有 Cloud Storage 的管理權限

### 錯誤：套件安裝失敗
- 嘗試全域安裝：`npm install -g @google-cloud/storage`
- 檢查網路連線

## 警告

⚠️ **實際刪除前請務必：**
1. 確認專案近期沒有部署問題
2. 檢查要刪除的檔案列表是否正確
3. 確保有其他方式可以重新部署（如本地程式碼備份）

🔥 **刪除後無法復原**，請謹慎操作！