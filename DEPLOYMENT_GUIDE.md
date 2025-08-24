# Deer Lab 部署指南

## 概述
本專案使用 Next.js 靜態匯出模式部署到 Firebase Hosting，並通過 GitHub Actions 實現自動化部署。

## 部署架構
- **前端**: Next.js 14 (靜態匯出模式)
- **後端**: Firebase Functions
- **託管**: Firebase Hosting
- **CI/CD**: GitHub Actions

## 自動部署流程

### GitHub Actions 工作流程
當您推送程式碼到 `main` 分支時，會自動觸發以下流程：

1. **環境設置**
   - 設置 Node.js 20
   - 安裝依賴套件
   - 安裝 Firebase CLI

2. **建置流程**
   - 執行 `npm run build-github`
   - 建置 Next.js 應用程式
   - 修正 CSS 路徑問題
   - 驗證建置結果

3. **部署**
   - 部署到 Firebase Hosting
   - 部署 Firebase Functions

## 本地開發

### 開發環境
```bash
npm run dev
```
應用程式會在 `http://localhost:8080` 啟動

### 本地建置測試
```bash
# 建置並修正路徑
npm run build-fixed

# 或使用 GitHub Actions 相同的流程
npm run build-github
```

### 本地部署測試
```bash
npm run deploy
```

## CSS 路徑修正

### 問題描述
Next.js 靜態匯出時，HTML 中的 CSS 路徑為 `/_next/static/css/...`，但實際檔案在 `out/static/css/...`，導致樣式無法載入。

### 解決方案
使用 `scripts/fix-paths.js` 腳本自動修正路徑：
- 將 `/_next/static/css/` 修正為 `./static/css/`
- 將 `/_next/static/chunks/` 修正為 `./static/chunks/`

### 驗證修正
修正後的 HTML 檔案會包含正確的路徑：
```html
<link rel="stylesheet" href="./static/css/12582220aac1b9e3.css" />
```

## 環境變數

### 本地開發
創建 `.env.local` 檔案：
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### GitHub Actions
在 GitHub 專案設定中設置以下 Secrets：
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_TOKEN`

## 故障排除

### 常見問題

1. **CSS 樣式未載入**
   - 檢查 `out/index.html` 中的 CSS 路徑是否正確
   - 確認 `scripts/fix-paths.js` 已執行

2. **建置失敗**
   - 檢查 Node.js 版本 (需要 18+)
   - 確認所有依賴已安裝
   - 檢查環境變數是否正確設置

3. **部署失敗**
   - 檢查 Firebase 專案設定
   - 確認 Firebase Token 是否有效
   - 檢查 GitHub Secrets 是否正確設置

### 手動修正
如果自動修正失敗，可以手動執行：
```bash
node scripts/fix-paths.js
```

## 檔案結構
```
deer-lab/
├── .github/workflows/deploy.yml    # GitHub Actions 工作流程
├── scripts/fix-paths.js            # CSS 路徑修正腳本
├── src/app/                        # Next.js 應用程式
├── functions/                      # Firebase Functions
├── out/                           # 建置輸出目錄
├── firebase.json                  # Firebase 配置
├── next.config.mts               # Next.js 配置
└── package.json                  # 專案配置
```

## 部署 URL
- **生產環境**: https://deer-lab.web.app
- **GitHub Actions**: https://github.com/your-username/deer-lab/actions
