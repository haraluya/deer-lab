# Deer Lab 部署問題解決方案

## 🎯 問題描述

您的 Next.js 應用程式在本地運行正常，但部署到 Firebase Hosting 後出現以下問題：

1. **JavaScript 檔案載入失敗** - 瀏覽器收到 HTML 而不是 JavaScript 檔案
2. **路徑錯誤** - `/_next/static/` 路徑無法正確解析
3. **應用程式卡住** - 頁面顯示載入中但無法正常運作

## 🔍 問題根源

這是 Next.js 靜態匯出 (`output: 'export'`) 的常見問題：

1. **路徑不匹配**：Next.js 生成的 HTML 檔案中的路徑是 `/_next/static/`，但實際檔案位置在 `/static/`
2. **Firebase 路由配置**：需要正確處理靜態檔案和 SPA 路由
3. **內容類型錯誤**：JavaScript 和 CSS 檔案需要正確的 Content-Type 標頭

## ✅ 解決方案

### 1. 修正建置腳本 (`scripts/build-static.js`)

自動修正 HTML 檔案中的路徑：

```javascript
// 修正路徑模式
const patterns = [
  { from: /href="\/_next\/static\//g, to: 'href="/static/' },
  { from: /src="\/_next\/static\//g, to: 'src="/static/' },
  { from: /"\/_next\/static\//g, to: '"/static/' },
  { from: /'\/_next\/static\//g, to: "'/static/" },
  { from: /`\/_next\/static\//g, to: '`/static/' }
];
```

### 2. 優化 Firebase 配置 (`firebase.json`)

正確處理靜態檔案和 SPA 路由：

```json
{
  "hosting": {
    "public": "out",
    "rewrites": [
      {
        "source": "/static/**",
        "destination": "/static/**"
      },
      {
        "source": "/_next/static/**",
        "destination": "/static/**"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.js",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/javascript"
          }
        ]
      },
      {
        "source": "**/*.css",
        "headers": [
          {
            "key": "Content-Type",
            "value": "text/css"
          }
        ]
      }
    ]
  }
}
```

### 3. 自動化部署流程

新增一鍵部署指令：

```bash
# 建置、部署並測試
npm run fix-and-deploy
```

## 🚀 部署步驟

### 方法一：一鍵部署（推薦）

```bash
npm run fix-and-deploy
```

### 方法二：分步驟部署

```bash
# 1. 建置專案
npm run build-static

# 2. 部署到 Firebase
npm run deploy-only

# 3. 測試部署
npm run test-deployment
```

### 方法三：使用腳本

#### Windows 用戶
```bash
scripts\deploy.bat
```

#### macOS/Linux 用戶
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 🧪 驗證部署

執行測試腳本驗證部署：

```bash
npm run test-deployment
```

測試項目包括：
- ✅ 主頁面載入
- ✅ Dashboard 頁面載入
- ✅ CSS 檔案載入
- ✅ JavaScript 檔案載入
- ✅ Manifest 檔案載入

## 📊 測試結果

```
📊 測試結果總結:
✅ 通過: 5
❌ 失敗: 0
📈 成功率: 100.0%

🎉 所有測試通過！部署成功！
🌍 您的應用程式已成功部署到: https://deer-lab.web.app
```

## 🔧 技術細節

### 路徑修正邏輯

1. **HTML 檔案掃描**：遞迴查找所有 HTML 檔案
2. **路徑替換**：將 `/_next/static/` 替換為 `/static/`
3. **多種模式**：處理 href、src、JavaScript 字串等不同情況
4. **檔案寫回**：將修正後的內容寫回檔案

### Firebase 配置說明

1. **靜態檔案路由**：確保 `/static/**` 路徑正確處理
2. **SPA 路由**：所有其他路由導向 `index.html`
3. **內容類型標頭**：確保 JavaScript 和 CSS 檔案有正確的 Content-Type
4. **快取控制**：HTML 檔案設定為不快取

## 🎉 結果

經過修正後，您的應用程式現在可以：

- ✅ 正確載入所有 JavaScript 檔案
- ✅ 正確載入所有 CSS 檔案
- ✅ 正常進行路由導航
- ✅ 完整的功能運作
- ✅ 快速載入和響應

## 📝 維護建議

1. **定期測試**：使用 `npm run test-deployment` 檢查部署狀態
2. **監控錯誤**：檢查瀏覽器開發者工具的 Console 和 Network 標籤
3. **更新配置**：當 Next.js 版本更新時，檢查配置是否需要調整

## 🔗 相關連結

- **應用程式網址**：https://deer-lab.web.app
- **Firebase Console**：https://console.firebase.google.com/project/deer-lab
- **GitHub Actions**：自動部署工作流程

---

**🎉 恭喜！您的 Deer Lab 生產管理系統現在已經可以正常運作了！**
