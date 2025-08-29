# Deer Lab 生產管理系統 (PMS)

這是一個基於 Next.js 14 和 Firebase 的現代化生產管理系統，專為電子煙製造業設計。系統採用 React 18、TypeScript、Tailwind CSS 和 shadcn/ui 組件庫構建，提供完整的生產流程管理功能，包括工單管理、物料管理、庫存追蹤、品質檢驗等核心業務功能。

## 專案架構概覽

### 根目錄檔案

- **`package.json`** - 專案依賴管理和腳本配置，包含建置、部署和開發腳本
- **`next.config.mts`** - Next.js 配置檔案，設定靜態匯出、圖片最佳化等選項
- **`tsconfig.json`** - TypeScript 編譯配置
- **`tailwind.config.ts`** - Tailwind CSS 樣式配置
- **`postcss.config.js`** - PostCSS 處理器配置
- **`eslint.config.mjs`** - ESLint 程式碼品質檢查配置
- **`components.json`** - shadcn/ui 組件庫配置
- **`firebase.json`** - Firebase 部署配置
- **`.firebaserc`** - Firebase 專案設定
- **`README.md`** - 專案說明文件

### 環境配置檔案

- **`.env.local`** - 本地環境變數（Firebase 配置等）
- **`.gitignore`** - Git 版本控制忽略檔案清單
- **`.gitattributes`** - Git 屬性配置

### 建置和部署相關

- **`next-env.d.ts`** - Next.js 類型定義
- **`out/`** - 靜態匯出目錄（建置後生成）
- **`.next/`** - Next.js 建置快取目錄

---

## 核心程式碼結構

### `/src` - 主要原始碼目錄

### `/src/app` - Next.js App Router 頁面

- **`layout.tsx`** - 根布局組件，包含 HTML 結構和 PWA 配置
- **`page.tsx`** - 首頁（登入頁面）
- **`globals.css`** - 全域 CSS 樣式
- **`client-provider.tsx`** - 客戶端提供者，初始化 Firebase 和認證

### `/src/app/dashboard` - 儀表板頁面

- **`page.tsx`** - 主儀表板頁面
- **`layout.tsx`** - 儀表板布局，包含側邊導航

### 工單管理模組

- **`work-orders/page.tsx`** - 工單列表頁面
- **`work-orders/create/page.tsx`** - 建立新工單頁面
- **`work-orders/[id]/page.tsx`** - 工單詳細資訊頁面
- **`work-orders/columns.tsx`** - 工單表格欄位定義
- **`work-orders/data-table.tsx`** - 工單資料表格組件
- **`work-orders/[id]/TimeTrackingDialog.tsx`** - 工時追蹤對話框

### 採購訂單模組

- **`purchase-orders/page.tsx`** - 採購訂單列表頁面
- **`purchase-orders/create/page.tsx`** - 建立採購訂單頁面
- **`purchase-orders/[id]/page.tsx`** - 採購訂單詳細資訊頁面

### 產品管理模組

- **`products/page.tsx`** - 產品列表頁面
- **`products/ProductDialog.tsx`** - 產品編輯對話框
- **`products/FragranceChangeDialog.tsx`** - 香精變更對話框

### 物料管理模組

- **`materials/page.tsx`** - 物料列表頁面
- **`materials/MaterialDialog.tsx`** - 物料編輯對話框
- **`material-categories/page.tsx`** - 物料分類頁面
- **`materials/MaterialCategoryDialog.tsx`** - 物料分類管理對話框（包含詳情檢視）

### 香精管理模組

- **`fragrances/page.tsx`** - 香精列表頁面
- **`fragrances/FragranceDialog.tsx`** - 香精編輯對話框

### 人員管理模組

- **`personnel/page.tsx`** - 人員列表頁面
- **`personnel/PersonnelDialog.tsx`** - 人員編輯對話框

### 供應商管理模組

- **`suppliers/page.tsx`** - 供應商列表頁面
- **`suppliers/SupplierDialog.tsx`** - 供應商編輯對話框

### 產品系列模組

- **`product-series/page.tsx`** - 產品系列列表頁面
- **`product-series/SeriesDialog.tsx`** - 系列編輯對話框

### 其他功能模組

- **`inventory/page.tsx`** - 庫存管理頁面
- **`reports/page.tsx`** - 報表頁面
- **`cost-management/page.tsx`** - 成本管理頁面
- **`production-calculator/page.tsx`** - 生產計算器頁面

### `/src/components` - 可重用組件

- **`ui/`** - shadcn/ui 基礎組件
    - `button.tsx` - 按鈕組件
    - `card.tsx` - 卡片組件
    - `input.tsx` - 輸入框組件
    - `table.tsx` - 表格組件
    - `dialog.tsx` - 對話框組件
    - `select.tsx` - 選擇器組件
    - `badge.tsx` - 標籤組件
    - `label.tsx` - 標籤組件
    - `sonner.tsx` - 通知組件
    - 其他 UI 組件...
- **`ConfirmDialog.tsx`** - 確認對話框組件
- **`DetailViewDialog.tsx`** - 詳細檢視對話框組件
- **`ImportExportDialog.tsx`** - 匯入匯出對話框組件
- **`LoadingSpinner.tsx`** - 載入動畫組件
- **`LowStockNotification.tsx`** - 低庫存通知組件
- **`ErrorBoundary.tsx`** - 錯誤邊界組件

### `/src/context` - React Context

- **`AuthContext.tsx`** - 認證狀態管理，處理用戶登入登出和權限控制

### `/src/hooks` - 自定義 React Hooks

- 目前為空，可擴展自定義 hooks

### `/src/lib` - 工具函數和配置

- **`firebase.ts`** - Firebase 初始化和配置
- **`cache.ts`** - 快取管理工具
- **`utils.ts`** - 通用工具函數

---

## 後端和部署配置

### `/functions` - Firebase Cloud Functions

- **`src/api/`** - API 端點
    - `auth.js` - 認證相關 API
    - `users.js` - 用戶管理 API
    - `workOrders.js` - 工單管理 API
    - `purchaseOrders.js` - 採購訂單 API
    - `products.js` - 產品管理 API
    - `materials.js` - 物料管理 API
    - `fragrances.js` - 香精管理 API
    - `personnel.js` - 人員管理 API
    - `suppliers.js` - 供應商管理 API
    - `inventory.js` - 庫存管理 API
    - `roles.js` - 角色權限 API
    - `productSeries.js` - 產品系列 API
    - `test.js` - 測試 API
- **`src/utils/`** - 後端工具函數
    - `auth.ts` - 後端認證工具
- **`src/index.ts`** - Cloud Functions 入口點
- **`package.json`** - 後端依賴配置
- **`tsconfig.json`** - 後端 TypeScript 配置

### 部署配置

- **`.github/workflows/`** - GitHub Actions 自動部署
    - `deploy.yml` - 主要部署工作流程
    - `deploy-simple.yml` - 簡化部署工作流程

### 靜態資源

- **`/public`** - 靜態檔案
    - `index.html` - 靜態首頁
    - `dashboard.html` - 靜態儀表板頁面
    - `manifest.json` - PWA 配置
    - `sw.js` - Service Worker
    - `test-permissions.html` - 權限測試頁面
    - `test-permissions-simple.html` - 簡化權限測試頁面

---

## 專案特色

1. **現代化技術棧**：使用 Next.js 14 App Router、React 18、TypeScript
2. **響應式設計**：支援桌面和行動裝置
3. **PWA 支援**：可安裝為應用程式
4. **即時資料同步**：使用 Firebase Firestore
5. **自動化部署**：GitHub Actions + Firebase Hosting
6. **模組化架構**：清晰的檔案結構和組件分離
7. **完整的生產管理功能**：涵蓋從訂單到出貨的完整流程