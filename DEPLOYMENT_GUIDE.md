# Deer Lab 生產管理系統 - 部署指南

## 問題診斷與解決方案

### 原始問題
- JavaScript 檔案載入失敗（收到 HTML 而不是 JS）
- 靜態檔案路徑錯誤
- SPA 路由與靜態檔案路由衝突
- 進入子頁面需要重新登入
- 只顯示純文字頁面

### 解決方案
1. **修正 Firebase 配置**：正確處理靜態檔案和 SPA 路由
2. **優化 Next.js 配置**：改善靜態匯出設定
3. **改進建置流程**：自動修正路徑問題
4. **自動化部署**：GitHub Actions 整合

## 部署方法

### 方法一：本地部署（推薦）

#### Windows 用戶
```bash
# 執行 Windows 部署腳本
scripts\deploy.bat
```

#### macOS/Linux 用戶
```bash
# 執行 Linux 部署腳本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### 手動部署
```bash
# 1. 清理舊建置
rm -rf .next out

# 2. 安裝依賴
npm install

# 3. 建置專案
npm run build-static

# 4. 部署到 Firebase
firebase deploy --only hosting
```

### 方法二：GitHub Actions 自動部署

1. **設定 Firebase Service Account**
   - 前往 Firebase Console > 專案設定 > 服務帳戶
   - 生成新的私鑰
   - 將 JSON 內容加入 GitHub Secrets 作為 `FIREBASE_SERVICE_ACCOUNT`

2. **推送程式碼**
   ```bash
   git add .
   git commit -m "Fix deployment configuration"
   git push origin main
   ```

3. **自動部署**
   - GitHub Actions 會自動觸發部署
   - 檢查 Actions 頁面確認部署狀態

## 配置檔案說明

### firebase.json
- 新增靜態檔案路由規則
- 正確處理 `/_next/static/` 到 `/static/` 的重定向
- 設定適當的 Cache-Control 標頭

### next.config.mts
- 設定 `output: 'export'` 進行靜態匯出
- 修正 `assetPrefix` 和路徑配置
- 啟用靜態匯出優化

### scripts/build-static.js
- 自動修正 HTML 檔案中的路徑
- 驗證建置結果
- 確保所有必要檔案存在

## 驗證部署

### 檢查清單
- [ ] 主頁面正常載入
- [ ] JavaScript 檔案正確載入（無 SyntaxError）
- [ ] CSS 樣式正確顯示
- [ ] 路由導航正常運作
- [ ] 登入功能正常
- [ ] 子頁面無需重新登入

### 除錯步驟
1. **檢查瀏覽器開發者工具**
   - Console 標籤：確認無 JavaScript 錯誤
   - Network 標籤：確認靜態檔案正確載入

2. **檢查 Firebase Hosting 日誌**
   ```bash
   firebase hosting:channel:list
   firebase hosting:channel:open preview
   ```

3. **本地測試**
   ```bash
   # 使用 Firebase 模擬器
   firebase serve --only hosting
   ```

## 常見問題

### Q: JavaScript 檔案仍然載入失敗
A: 檢查 `firebase.json` 中的 rewrite 規則是否正確設定

### Q: 樣式沒有載入
A: 確認 CSS 檔案路徑已從 `/_next/static/` 修正為 `/static/`

### Q: 路由導航失敗
A: 確認 SPA 路由規則在 `firebase.json` 中正確設定

### Q: 部署後頁面空白
A: 檢查建置輸出是否包含所有必要檔案

## 維護建議

1. **定期更新依賴**
   ```bash
   npm update
   npm audit fix
   ```

2. **監控部署狀態**
   - 設定 Firebase 監控
   - 檢查 GitHub Actions 日誌

3. **備份配置**
   - 保存重要的配置檔案
   - 記錄部署步驟

## 聯絡支援

如果遇到部署問題，請提供：
- 錯誤訊息截圖
- 瀏覽器開發者工具日誌
- 部署腳本輸出
- Firebase 專案 ID
