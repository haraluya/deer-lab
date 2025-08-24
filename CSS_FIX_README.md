# CSS 載入問題修正說明

## 問題描述
在 Next.js 靜態匯出模式下，生成的 HTML 檔案中的 CSS 路徑為 `/_next/static/css/...`，但實際檔案位置在 `out/static/css/...` 目錄下，導致 CSS 無法正確載入，登入頁面顯示為無樣式的狀態。

## 解決方案

### 1. 修正腳本
創建了 `scripts/fix-paths.js` 腳本來修正 HTML 檔案中的路徑：

```javascript
// 修正CSS路徑
content = content.replace(
  /href="\/_next\/static\/css\//g,
  'href="./static/css/'
);

// 修正JS路徑
content = content.replace(
  /src="\/_next\/static\/chunks\//g,
  'src="./static/chunks/'
);
```

### 2. 建置流程更新
在 `package.json` 中新增了修正後的建置指令：

```json
{
  "scripts": {
    "build-fixed": "npx next build && node scripts/fix-paths.js",
    "deploy": "npm run build-fixed && firebase deploy"
  }
}
```

### 3. Firebase 配置
在 `firebase.json` 中新增了重定向規則：

```json
{
  "redirects": [
    {
      "source": "/_next/static/**",
      "destination": "/static/**",
      "type": 301
    }
  ]
}
```

## 使用方法

### 開發環境
```bash
npm run dev
```

### 建置並修正路徑
```bash
npm run build-fixed
```

### GitHub Actions 自動部署
當您推送程式碼到 `main` 分支時，GitHub Actions 會自動：
1. 執行 `npm run build-github` 指令
2. 建置 Next.js 應用程式
3. 修正 CSS 路徑
4. 部署到 Firebase Hosting

### 手動部署到 Firebase
```bash
npm run deploy
```

## 驗證修正
修正後，HTML 檔案中的 CSS 路徑會從：
```html
<link rel="stylesheet" href="/_next/static/css/12582220aac1b9e3.css" />
```

變為：
```html
<link rel="stylesheet" href="./static/css/12582220aac1b9e3.css" />
```

這樣就能正確載入 CSS 檔案，登入頁面會顯示完整的樣式。

## 注意事項
- 每次建置後都會自動執行路徑修正
- 修正腳本會處理所有 HTML 檔案
- 如果 out 目錄不存在，腳本會提示先執行建置
