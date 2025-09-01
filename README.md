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

## 🚀 快速開始

### 前置需求
- Node.js 18+ 
- Firebase CLI
- Git

### 安裝步驟

1. **克隆專案**
```bash
git clone https://github.com/haraluya/deer-lab.git
cd deer-lab
```

2. **安裝依賴**
```bash
npm install
npm run install:functions
```

3. **設定 Firebase**
```bash
# 登入 Firebase
firebase login

# 選擇或創建 Firebase 專案
firebase use --add
```

4. **環境變數設定**
```bash
# 複製環境變數範本
cp .env.local.example .env.local

# 填入您的 Firebase 配置
# NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
# ...
```

5. **啟動開發伺服器**
```bash
npm run dev
```

應用程式將在 [http://localhost:8080](http://localhost:8080) 啟動。

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

### 部署
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

## 🌐 部署資訊

- **生產環境**: [https://deer-lab.web.app](https://deer-lab.web.app)
- **Firebase 專案**: 支援自動擴展和全球 CDN
- **SSL 憑證**: 自動 HTTPS 支援

## 📞 支援與貢獻

### 取得幫助
- 📚 [系統說明書](./系統說明書.md) - 完整使用指南
- 📝 [CLAUDE.md](./CLAUDE.md) - 開發者文檔
- 🐛 [Issues](https://github.com/haraluya/deer-lab/issues) - 問題回報

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