# GitHub Actions 設定指南

## 常見錯誤和解決方案

### 1. Firebase Service Account 錯誤

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

### 2. 建置失敗錯誤

**錯誤訊息：**
```
❌ Build failed: index.html not found
```

**解決方案：**
- 檢查 `package.json` 中的 `build-static` 腳本
- 確保 `scripts/build-static.js` 存在且可執行

### 3. 權限錯誤

**錯誤訊息：**
```
Error: Could not deploy to Firebase
```

**解決方案：**
- 確保 Firebase Service Account 有部署權限
- 檢查 Firebase 專案 ID 是否正確

## 快速修復步驟

### 步驟 1：檢查 Secrets
確保以下 Secrets 已設定：
- `FIREBASE_SERVICE_ACCOUNT` - Firebase 服務帳戶 JSON

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
