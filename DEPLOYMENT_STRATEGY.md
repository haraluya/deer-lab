# 部署策略說明

## 當前部署策略

### 1. 只部署 Firebase Hosting
- 目前只部署 Next.js 靜態應用程式到 Firebase Hosting
- 避免 Firebase Functions 的複雜性和依賴項問題
- 確保快速、穩定的部署

### 2. 為什麼不部署 Functions？
- Firebase Functions 需要複雜的依賴項管理
- 舊的 Functions 與新的建置腳本不兼容
- 需要手動刪除舊的 Functions 才能重新部署

### 3. 部署流程
1. **建置 Next.js 應用程式**
   - 使用 `build-static.sh` 腳本
   - 生成靜態檔案到 `out/` 目錄
   - 包含所有必要的 HTML、CSS、JavaScript 檔案

2. **部署到 Firebase Hosting**
   - 使用 `firebase deploy --only hosting`
   - 只部署 `out/` 目錄的內容
   - 跳過 Functions 部署

### 4. 如果需要 Functions
如果將來需要 Firebase Functions，可以：

1. **手動刪除舊 Functions**：
   ```bash
   firebase functions:delete [function-name] --region us-central1 --force
   ```

2. **修復 Functions 建置**：
   - 解決依賴項問題
   - 修復 TypeScript 編譯錯誤
   - 確保所有 API 端點正確匯出

3. **重新啟用 Functions 部署**：
   - 修改 GitHub Actions 工作流程
   - 添加 Functions 建置步驟
   - 使用 `firebase deploy` 而不是 `--only hosting`

### 5. 當前優勢
- ✅ 快速部署
- ✅ 穩定可靠
- ✅ 避免複雜的依賴項問題
- ✅ 專注於前端應用程式

### 6. 測試網站
- 主頁：https://deer-lab.web.app
- 測試頁面：https://deer-lab.web.app/test.html

## 下一步
1. 確保主頁正常運作
2. 測試所有前端功能
3. 如果需要後端功能，再考慮修復 Functions
