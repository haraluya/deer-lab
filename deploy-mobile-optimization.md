# 手機版優化部署指南

## 已完成的優化項目

### 1. 圖片上傳問題修復
- ✅ 移除 Base64 備用方法，避免文檔過大
- ✅ 降低圖片壓縮品質和尺寸限制
- ✅ 改進錯誤處理和權限檢查
- ✅ 添加圖片預覽功能

### 2. 手機版佈局優化
- ✅ 響應式容器和間距調整
- ✅ 手機版按鈕全寬顯示
- ✅ 優化表格和卡片的手機版顯示
- ✅ 改進對話框的手機版適配

### 3. 文字和間距優化
- ✅ 手機版文字大小調整
- ✅ 響應式間距和網格佈局
- ✅ 優化表格標題和內容顯示

### 4. 全域樣式優化
- ✅ 添加手機版專用 CSS 類別
- ✅ 優化圖片預覽模態框
- ✅ 改進按鈕和對話框樣式

## 部署步驟

### 1. 本地測試
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 在手機或瀏覽器開發者工具中測試手機版
```

### 2. 建置專案
```bash
# 建置生產版本
npm run build

# 測試建置結果
npm start
```

### 3. 部署到 GitHub Pages

#### 方法一：使用 GitHub Actions (推薦)

1. 在專案根目錄創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./out
```

2. 在 GitHub 設定中啟用 GitHub Pages：
   - 前往 Settings > Pages
   - Source 選擇 "GitHub Actions"

#### 方法二：手動部署

```bash
# 推送到 GitHub
git add .
git commit -m "feat: 完成手機版優化"
git push origin main

# 如果使用 GitHub Pages，確保 next.config.mts 設定正確
```

### 4. Firebase Hosting 部署

如果您使用 Firebase Hosting：

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 建置專案
npm run build

# 部署到 Firebase
firebase deploy
```

## 測試清單

### 手機版功能測試
- [ ] 工單列表頁面手機版顯示
- [ ] 工單詳情頁面手機版顯示
- [ ] 圖片上傳功能正常
- [ ] 留言功能手機版適配
- [ ] 表格手機版滾動正常
- [ ] 按鈕和對話框手機版顯示

### 圖片功能測試
- [ ] 圖片上傳權限正常
- [ ] 圖片壓縮功能正常
- [ ] 圖片預覽功能正常
- [ ] 避免文檔過大問題

### 響應式設計測試
- [ ] 手機版 (320px-768px)
- [ ] 平板版 (768px-1024px)
- [ ] 桌面版 (1024px+)

## 注意事項

1. **Firebase Storage 權限**：確保本地開發環境的 Firebase Storage 規則設定正確
2. **圖片大小限制**：每張圖片最大 2MB，總共不超過 10MB
3. **手機版優化**：所有頁面都已完成手機版適配
4. **效能優化**：圖片壓縮和懶加載已實作

## 技術細節

### 圖片上傳優化
- 最大尺寸：800x600
- 壓縮品質：0.6
- 檔案大小限制：2MB/張
- 總大小限制：10MB

### 手機版斷點
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

### 主要修改檔案
- `src/lib/imageUpload.ts` - 圖片上傳邏輯
- `src/app/dashboard/work-orders/[id]/page.tsx` - 工單詳情頁面
- `src/app/dashboard/work-orders/page.tsx` - 工單列表頁面
- `src/app/dashboard/work-orders/data-table.tsx` - 工單表格
- `src/app/globals.css` - 全域樣式
- `src/app/dashboard/layout.tsx` - 主佈局

## 後續優化建議

1. **PWA 支援**：添加 Service Worker 和離線功能
2. **圖片懶加載**：實作 Intersection Observer API
3. **手勢支援**：添加滑動手勢操作
4. **深色模式**：實作深色主題支援
5. **效能監控**：添加效能監控和分析
