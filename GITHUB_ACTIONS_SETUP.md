# GitHub Actions 設定指南

## 常見錯誤和解決方案

### 1. Node.js 版本錯誤

**錯誤訊息：**
```
Firebase CLI v14.14.0 is incompatible with Node.js v18.20.8
Please upgrade Node.js to version >=20.0.0 || >=22.0.0
```

**解決方案：**
- ✅ 已修正：GitHub Actions 現在使用 Node.js 20
- 如果仍有問題，可以使用 `deploy-stable.yml` 工作流程

### 2. Firebase Service Account 錯誤

**錯誤訊息：**
```
Error: Could not find Firebase service account credentials
```

**解決方案：**

1. **生成 Firebase Service Account 金鑰**
   - 前往 [Firebase Console](https://console.firebase.google.com/)
   - 選擇您的專案 `deer-lab`
   - 前往 **專案設定** > **服務帳戶**
   - 點擊 **生成新的私鑰**
   - 下載 JSON 檔案

2. **設定 GitHub Secrets**
   - 前往您的 GitHub 專案
   - 點擊 **Settings** > **Secrets and variables** > **Actions**
   - 點擊 **New repository secret**
   - 名稱：`FIREBASE_SERVICE_ACCOUNT`
   - 值：將整個 JSON 檔案內容貼上

### 3. Firebase Token 錯誤（替代方案）

**錯誤訊息：**
```
Error: Could not authenticate with Firebase
```

**解決方案：**

1. **生成 Firebase Token**
   ```bash
   firebase login:ci
   ```

2. **設定 GitHub Secret**
   - 名稱：`FIREBASE_TOKEN`
   - 值：從 `firebase login:ci` 獲得的 token

### 4. 建置失敗錯誤

**錯誤訊息：**
```
❌ Build failed: index.html not found
```

**解決方案：**
- 檢查 `package.json` 中的 `build-static` 腳本
- 確保 `scripts/build-static.js` 存在且可執行

## 快速修復步驟

### 步驟 1：選擇部署方式

**方式 A：使用 Firebase Service Account（推薦）**
- 設定 `FIREBASE_SERVICE_ACCOUNT` secret
- 使用 `deploy.yml` 或 `deploy-simple.yml`

**方式 B：使用 Firebase Token**
- 設定 `FIREBASE_TOKEN` secret
- 使用 `deploy-stable.yml`

### 步驟 2：測試本地建置
```bash
npm run build-static
```

### 步驟 3：推送程式碼
```bash
git add .
git commit -m "Fix GitHub Actions configuration"
git push origin main
```

### 步驟 4：檢查 Actions
- 前往 GitHub 專案的 **Actions** 標籤
- 查看最新的工作流程執行結果

## 工作流程選擇

### 1. deploy.yml（推薦）
- 使用 Firebase Service Account
- 完整的建置驗證
- 詳細的錯誤報告

### 2. deploy-simple.yml（簡化版）
- 使用 Firebase Service Account
- 簡化的建置流程
- 快速部署

### 3. deploy-stable.yml（穩定版）
- 使用 Firebase Token
- 固定版本的 Firebase CLI
- 最穩定的部署方式

## 替代方案

如果 GitHub Actions 持續失敗，可以使用：

### 本地部署
```bash
npm run deploy-and-test
```

### 手動部署
```bash
npm run build-static
firebase deploy --only hosting
```

## 除錯技巧

1. **查看詳細日誌**
   - 在 GitHub Actions 中點擊失敗的步驟
   - 查看完整的錯誤訊息

2. **本地測試**
   - 在本地執行相同的建置步驟
   - 確認問題是否在本地重現

3. **檢查檔案結構**
   - 確保所有必要的檔案都存在
   - 檢查檔案權限

## 聯絡支援

如果問題持續，請提供：
- GitHub Actions 錯誤日誌截圖
- Firebase 專案設定截圖
- 本地建置輸出
