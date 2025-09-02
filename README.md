# 🦌 鹿鹿小作坊 (Deer Lab)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/haraluya/deer-lab)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/Firebase-Ready-orange.svg)](https://firebase.google.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

**專為小型製造工坊設計的全方位生產管理系統**

一個現代化、響應式的生產管理平台，整合庫存、採購、工單、成本和人力資源管理功能，支援即時協作和跨裝置同步。

## 🌟 核心特色

### 📊 完整的生產流程管理
- **庫存管理**: 智能庫存監控、低庫存預警、生產能力評估
- **採購管理**: 全域購物車系統、多供應商採購、即時同步
- **工單管理**: 完整生產生命週期、BOM 自動計算、工時追蹤
- **成本分析**: 實時成本計算、趨勢分析、利潤監控

### 🎯 智能化功能
- **智能匯入匯出**: 自動判斷新增或更新模式
- **批量工時申報**: 支援單一和批量新增模式
- **生產能力評估**: 智能計算物料需求和生產排程
- **三級權限系統**: 系統管理員、生產領班、計時人員

### 💻 現代化技術架構
- **前端**: Next.js 14 + React 18 + TypeScript
- **UI 框架**: Radix UI + Tailwind CSS
- **後端**: Firebase Functions + Firestore
- **認證**: Firebase Authentication
- **部署**: Firebase Hosting

## 🚀 快速部署指南

### ⚠️ 重要提醒：SSR 架構系統
本系統採用 **Server-Side Rendering (SSR)** 架構，必須部署到支援 Node.js 的伺服器環境，**不可使用靜態網站部署**。

### 前置需求
- **Node.js 20+** （推薦使用 20.x LTS）
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** 版本控制系統
- **Firebase 專案**（需要 Blaze 付費計劃支援 Functions）

### 🔥 Firebase 專案設定

1. **建立 Firebase 專案**
```bash
# 前往 Firebase Console 建立新專案
# https://console.firebase.google.com/

# 啟用以下服務：
# ✅ Authentication (啟用 Email/Password 登入)
# ✅ Firestore Database (生產模式)
# ✅ Storage (預設規則)
# ✅ Functions (需要 Blaze 計劃)
# ✅ Hosting
```

2. **安裝與登入 Firebase CLI**
```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase 帳號
firebase login

# 驗證登入狀態
firebase projects:list
```

### 📦 專案安裝與設定

1. **克隆並安裝專案**
```bash
git clone https://github.com/haraluya/deer-lab.git
cd deer-lab

# 安裝主專案依賴
npm install

# 安裝 Firebase Functions 依賴
npm run install:functions
```

2. **選擇 Firebase 專案**
```bash
# 選擇您的 Firebase 專案
firebase use --add

# 選擇專案並設定別名（例如：production）
# 確認選擇正確的專案
firebase use --list
```

3. **環境變數配置**
```bash
# 在專案根目錄建立 .env.local 檔案
# 填入以下必要的 Firebase 配置：

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 🔍 如何取得這些配置值：
# 1. 前往 Firebase Console > 專案設定
# 2. 向下捲動至「您的應用程式」區域
# 3. 選擇網路應用程式，複製配置物件
```

### 🚀 部署流程

#### 完整部署（推薦用於首次部署）
```bash
# 建構並部署 Functions + Hosting
npm run deploy-full

# 如果出現權限錯誤，請確保：
# 1. Firebase 專案已升級至 Blaze 計劃
# 2. 已啟用必要的 API 服務
```

#### 僅部署前端 Hosting
```bash
# 適用於僅前端程式碼變更
npm run deploy
```

#### 僅部署 Firebase Functions
```bash
# 適用於僅後端邏輯變更
cd functions
npm run deploy
```

### 🔧 初始系統設定

部署完成後，需要進行以下設定：

1. **建立第一個管理員帳號**
```bash
# 訪問您的部署網址
# 註冊第一個帳號（自動成為系統管理員）
```

2. **初始化權限系統**
```bash
# 登入後進入：成員管理 > 權限管理
# 點擊「初始化預設角色」按鈕
# 系統將自動建立三種角色和權限配置
```

3. **驗證系統功能**
```bash
# 測試以下核心功能：
# ✅ 使用者註冊/登入
# ✅ 權限系統運作
# ✅ 資料庫讀寫正常
# ✅ 檔案上傳功能
# ✅ 即時同步功能
```

## 📋 主要功能模組

### 🏠 工作台
- 系統總覽儀表板
- 關鍵業務指標統計
- 快速功能訪問

### 👥 團隊管理
- **成員管理**: 人員資料、職位、部門管理
- **工時統計**: 個人工時記錄、月度統計
- **權限管理**: 三級角色權限系統

### 🏭 供應鏈管理
- **供應商管理**: 供應商資料、產品分類
- **採購訂單**: 全域購物車、多供應商採購

### 🔧 生產中心
- **原料庫**: 物料管理、智能匯入匯出
- **配方庫**: 香精管理、供應商篩選
- **產品目錄**: 產品系列、配方管理
- **生產工單**: 完整工單管理、工時申報

### 📊 營運分析
- **庫存監控**: 即時庫存、低庫存警告
- **庫存歷史**: 完整異動稽核軌跡
- **成本分析**: 成本計算、趨勢分析
- **工時報表**: 全公司工時統計

## 🛠️ 開發指令

### 開發環境
```bash
npm run dev                    # 啟動開發伺服器 (端口 8080)
npm run build                  # 建構生產版本
npm run start                  # 啟動生產伺服器
npm run lint                   # ESLint 程式碼檢查
```

### Firebase Functions
```bash
npm run lint:functions         # 檢查 Functions 程式碼
npm run install:functions      # 安裝 Functions 依賴
```

### 本地開發
```bash
npm run dev                    # 啟動開發伺服器 (端口 8080)
npm run build                  # 建構生產版本
npm run start                  # 啟動生產伺服器
npm run lint                   # ESLint 程式碼檢查
```

### 部署相關
```bash
npm run deploy                 # 部署到 Firebase Hosting  
npm run deploy-full           # 完整部署 (hosting + functions)
npm run deploy-only           # 僅部署 hosting
```

## 📁 專案結構

```
deer-lab/
├── src/
│   ├── app/                    # Next.js App Router 頁面
│   │   └── dashboard/          # 主要功能頁面
│   ├── components/             # 可重用 React 組件
│   │   └── ui/                # UI 組件庫
│   ├── context/               # React Contexts
│   ├── hooks/                 # 自訂 Hooks
│   ├── lib/                   # 工具函式庫
│   ├── types/                 # TypeScript 類型定義
│   └── utils/                 # 輔助函數
├── functions/                 # Firebase Functions
│   └── src/
│       ├── api/               # API 端點
│       └── utils/             # 工具函數
├── public/                    # 靜態資源
└── 配置檔案
```

## 🎨 核心技術

### 前端技術棧
- **Next.js 14**: App Router, Server Components
- **React 18**: Hooks, Context API
- **TypeScript**: 完整類型定義
- **Tailwind CSS**: 實用優先的 CSS 框架
- **Radix UI**: 高品質 UI 組件庫

### 後端服務
- **Firebase Functions**: 無伺服器後端服務
- **Firestore**: NoSQL 文檔資料庫
- **Firebase Auth**: 身份驗證服務
- **Firebase Storage**: 檔案儲存服務

### 開發工具
- **ESLint**: 程式碼品質檢查
- **TypeScript**: 靜態類型檢查
- **Git**: 版本控制

## 🔐 權限系統

### 三級角色設計
- **🔴 系統管理員**: 全部權限，包含人員和權限管理
- **🔵 生產領班**: 生產相關權限，無成員管理權限
- **🟢 計時人員**: 工時記錄和基本查看權限

### 權限特色
- 動態側邊欄顯示
- 頁面級別存取控制
- API 端點權限驗證
- 角色初始化支援

## 📱 響應式設計

- **桌面優先**: 完整功能體驗
- **平板適配**: 最佳化觸控介面
- **手機支援**: 卡片式設計，完美行動體驗

## 🎨 自定義品牌設定

### 更換 LOGO 和 ICON

系統支援完整的品牌自定義，您需要替換以下檔案：

#### 必要的 ICON 檔案
```bash
public/
├── favicon.png              # 32x32 網站圖示
├── icon-16x16.png          # 16x16 瀏覽器標籤圖示
├── icon-32x32.png          # 32x32 瀏覽器圖示
├── icon-192x192.png        # 192x192 PWA 圖示
├── icon-512x512.png        # 512x512 PWA 圖示
└── apple-touch-icon.png    # 180x180 Apple 裝置圖示
```

#### 主要 LOGO 檔案
```bash
public/
├── dexter-lab-logo.svg     # 主要 LOGO (SVG 格式)
├── Dexter's.png           # 替代 LOGO (PNG 格式)
└── buck.svg               # 品牌圖示 (可選)
```

#### 應用程式設定檔案
```bash
# 1. 修改應用程式標題和描述
src/app/layout.tsx          # 更新 metadata 物件

# 2. 修改 PWA 設定
public/manifest.json        # 更新應用程式名稱和描述

# 3. 修改主題顏色
src/app/layout.tsx          # 更新 theme-color meta 標籤
```

#### 替換步驟
1. **準備您的品牌檔案**：確保所有圖示符合指定尺寸
2. **替換檔案**：使用相同檔名覆蓋 public/ 目錄中的檔案
3. **更新設定**：修改 layout.tsx 和 manifest.json 中的品牌資訊
4. **重新部署**：執行 `npm run deploy` 套用變更

### 主題色彩自定義

系統使用 Tailwind CSS，主要色彩定義在：
```bash
tailwind.config.ts          # 主題色彩配置
src/app/globals.css         # CSS 變數定義
```

## 🌐 部署資訊

- **生產環境**: [https://deer-lab.web.app](https://deer-lab.web.app)
- **架構**: SSR (Server-Side Rendering) + Firebase Functions
- **SSL 憑證**: 自動 HTTPS 支援
- **CDN**: Firebase Hosting 全球內容分發網路

## ⚠️ 故障排除與常見問題

### 🔧 部署常見問題

#### 1. Firebase Functions 部署失敗
**錯誤**: `Error: HTTP Error: 403, The caller does not have permission`

**解決方案**:
```bash
# 確認 Firebase 專案已升級至 Blaze 計劃
# 檢查是否啟用必要的 API
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com

# 重新認證
firebase logout
firebase login
```

#### 2. 建構錯誤 - Module not found
**錯誤**: `Module not found: Can't resolve 'firebase/app'`

**解決方案**:
```bash
# 清理並重新安裝依賴
rm -rf node_modules package-lock.json
rm -rf functions/node_modules functions/package-lock.json
npm install
npm run install:functions
```

#### 3. SSR 部署後頁面空白
**錯誤**: 部署後網站顯示空白頁面

**解決方案**:
```bash
# 檢查 firebase.json 配置
# 確保 rewrites 設定指向正確的 function
# 檢查 Functions 部署狀態
firebase functions:log --limit 50
```

#### 4. Firestore 權限錯誤
**錯誤**: `Missing or insufficient permissions`

**解決方案**:
```bash
# 確認 Firestore 安全規則
# 檢查用戶認證狀態
# 確認 Firebase Auth 設定正確
```

### 💻 開發環境問題

#### 1. 開發伺服器無法啟動
**錯誤**: `Port 8080 is already in use`

**解決方案**:
```bash
# 檢查並終止佔用的程序
lsof -ti:8080 | xargs kill -9

# 或使用不同端口
npm run dev -- --port 3001
```

#### 2. TypeScript 編譯錯誤
**錯誤**: 大量 TypeScript 類型錯誤

**解決方案**:
```bash
# 檢查 TypeScript 版本
npm list typescript

# 重新生成類型檔案
npm run build
```

#### 3. 環境變數未載入
**錯誤**: Firebase 配置為 undefined

**解決方案**:
```bash
# 確認 .env.local 檔案存在且格式正確
# 檢查變數名稱必須以 NEXT_PUBLIC_ 開頭
# 重新啟動開發伺服器
```

### 🔍 效能優化建議

#### 1. 資料庫查詢優化
```bash
# 建立適當的 Firestore 索引
# 限制查詢結果數量
# 使用分頁載入大量資料
```

#### 2. 圖片檔案優化
```bash
# 壓縮上傳的圖片檔案
# 使用適當的圖片格式
# 實作延遲載入
```

#### 3. 快取策略
```bash
# 使用 Firebase Hosting 快取設定
# 實作適當的瀏覽器快取標頭
# 優化 Service Worker 快取策略
```

### 📋 系統需求檢查清單

部署前請確認：
- ✅ Node.js 版本 20.x 或更高
- ✅ Firebase CLI 已安裝並登入
- ✅ Firebase 專案已升級至 Blaze 計劃
- ✅ 所有必要的 Firebase 服務已啟用
- ✅ .env.local 檔案配置正確
- ✅ 網路連接穩定，支援 HTTPS

### 🆘 取得技術支援

如果以上解決方案無法解決您的問題：

1. **查看日誌**:
```bash
# Firebase Functions 日誌
firebase functions:log --limit 100

# 瀏覽器開發者工具 Console
# 檢查網路請求和錯誤訊息
```

2. **系統資訊收集**:
```bash
# 收集環境資訊
node --version
npm --version
firebase --version
```

3. **聯繫支援**:
- 📝 [CLAUDE.md](./CLAUDE.md) - 開發者詳細文檔
- 🐛 [GitHub Issues](https://github.com/haraluya/deer-lab/issues) - 問題回報
- 📧 技術支援：在 Issues 中詳細描述問題和環境資訊

## 📞 支援與貢獻

### 取得幫助
- 📚 完整開發者文檔：[CLAUDE.md](./CLAUDE.md)
- 🔧 故障排除：參考上方常見問題解決方案
- 🐛 問題回報：[GitHub Issues](https://github.com/haraluya/deer-lab/issues)

### 貢獻指南
1. Fork 這個專案
2. 創建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款。查看 [LICENSE](LICENSE) 檔案了解詳細資訊。

## 🙏 致謝

感謝所有為「鹿鹿小作坊」專案做出貢獻的開發者和使用者。

---

**© 2024-2025 鹿鹿小作坊開發團隊. 保留所有權利.**

*Built with ❤️ in Taiwan*