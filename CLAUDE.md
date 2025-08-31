# CLAUDE.md

本檔案為 Claude Code (claude.ai/code) 在此程式碼庫中工作時提供指引。

## 專案概述

這是「鹿鹿小作坊」(Deer Lab)，一個使用 Next.js 和 Firebase 建構的全方位生產管理系統。該系統管理小型製造工坊的完整生產流程，包括庫存、採購、工單和生產計劃。

## 架構設計

### 技術堆疊
- **前端**: Next.js 14 (App Router), React 18, TypeScript
- **UI 函式庫**: Radix UI 元件配合 Tailwind CSS
- **後端**: Firebase Functions (Node.js 20)
- **資料庫**: Firestore
- **身份驗證**: Firebase Auth
- **檔案儲存**: Firebase Storage
- **部署**: Firebase Hosting

### 主要目錄結構
```
src/
├── app/                    # Next.js App Router 頁面
│   ├── dashboard/          # 主要應用程式儀表板
│   │   ├── inventory/      # 🆕 全新庫存管理系統 (components/)
│   │   ├── inventory-old/  # 舊版庫存管理 (已備份)
│   │   ├── materials/      # 物料管理
│   │   ├── fragrances/     # 香精管理
│   │   ├── products/       # 產品管理
│   │   ├── purchase-orders/ # 採購管理
│   │   ├── work-orders/    # 工單管理
│   │   ├── inventory-records/ # 庫存追蹤
│   │   └── suppliers/      # 供應商管理
├── components/             # 可重用的 React 元件
│   └── ui/                # Radix UI 元件
├── lib/                   # 工具函式庫
├── context/               # React contexts
└── hooks/                 # 自訂 React hooks

functions/                 # Firebase Functions
```

### 核心模組

1. **庫存管理系統** ✨ **最新重新設計 (2024)**
   - **現代化介面設計**: 4個統計卡片（總物料數、總香精數、總香精成本、總物料成本）
   - **智能庫存表格**: 可切換物料/香精顯示，支援即時搜尋和快速調整
   - **專業視覺設計**: 採用漸變色彩、動畫效果和響應式設計
   - **模態化快速操作**:
     - 低庫存項目警告系統 (`LowStockDialog`)
     - 一鍵快速庫存調整 (`QuickUpdateDialog`) 
     - 生產能力評估工具 (`ProductionCapacityDialog`)
   - 完整的庫存紀錄與稽核軌跡
   - 自動化低庫存通知與補貨建議

2. **採購管理系統**
   - 購物車功能與本地儲存
   - 多供應商採購單管理
   - 採購單狀態追蹤 (預報單/已訂購/已入庫)
   - 與物料和香精的整合

3. **工單系統**
   - 生產規劃與配方計算機
   - BOM (物料清單) 自動計算
   - 工時追蹤與勞動力報告
   - 整個生產生命週期的狀態管理

4. **產品與配方管理**
   - 產品系列組織
   - 配方制定與自動縮放
   - 與物料和香精的整合
   - 生產數量計算

## 開發指令

### 主要專案
```bash
# 開發
npm run dev                    # 在埠口 8080 啟動開發伺服器

# 建構與部署
npm run build                  # 建構生產版本
npm run start                  # 啟動生產伺服器
npm run lint                   # 執行 ESLint
npm run deploy                 # 建構並部署到 Firebase Hosting
npm run deploy-full           # 完整部署 (hosting + functions)
npm run deploy-only           # 僅部署 hosting

# Functions
npm run lint:functions        # Lint Firebase Functions
npm run install:functions     # 安裝 function 相依套件
```

### Firebase Functions
```bash
cd functions
npm run build                 # 編譯 TypeScript
npm run lint                  # Lint functions 程式碼
npm run serve                 # 執行本地模擬器
npm run test                  # 執行 Jest 測試
npm run deploy               # 僅部署 functions
```

### 🆕 新增的庫存管理 Firebase Functions (2024)
```bash
# 已部署的新 Functions:
- getInventoryOverview       # 取得庫存統計概覽
- quickUpdateInventory       # 快速更新庫存數量
- getLowStockItems           # 取得低庫存項目清單
```

## 重要組態檔案

- `firebase.json` - Firebase hosting 和 functions 組態
- `next.config.mts` - Next.js 組態與 Firebase 相容性
- `tailwind.config.ts` - Tailwind CSS 組態
- `functions/package.json` - Functions 相依套件與腳本
- `src/components/ui/skeleton.tsx` - 🆕 Skeleton 載入組件 (2024新增)

## 重要開發注意事項

### 狀態管理
- 使用 React Context 進行身份驗證 (`AuthContext`)
- 本地儲存用於採購車持久化 (`usePurchaseCart` hook)
- Firestore 即時訂閱用於即時資料更新

### Firebase 整合
- 所有資料操作使用 Firestore 集合
- Firebase Storage 用於圖片上傳與自動壓縮
- Firebase Functions 用於伺服器端邏輯
- 自訂 Firebase 組態處理 Next.js 相容性問題

### UI 元件
- 使用 Radix UI 基礎元件建構
- 全系統一致的橘色/藍色漸層主題
- 響應式設計採用行動優先方法
- 透過 `next-themes` 支援深色/淺色模式

### 資料模型
主要 Firestore 集合：
- `materials` - 原物料庫存
- `fragrances` - 香精庫存
- `products` - 成品
- `purchase_orders` - 採購管理
- `work_orders` - 生產訂單
- `inventory_records` - 庫存變更稽核軌跡
- `suppliers` - 供應商資訊

### 身份驗證與權限
- Firebase Auth 整合
- 基於角色的存取控制
- 員工編號的使用者檔案管理
- 儀表板佈局中的自動身份驗證檢查

### 開發工作流程
1. 系統使用全面的庫存追蹤系統記錄所有變更
2. 採購管理包含跨會話持久化的購物車系統
3. 工單與產品配方整合以自動計算 BOM
4. 所有主要操作在庫存紀錄系統中建立稽核軌跡

### 效能考量
- 使用 `useMemo` 和 `useCallback` 進行最佳化
- 大型資料集實作分頁 (每頁 10 項)
- 上傳檔案的圖片壓縮
- 具有適當索引的高效 Firestore 查詢

### 測試
- Functions 包含 Jest 測試設定
- 專案 README 檔案中記錄手動測試工作流程
- 全面測試涵蓋響應式設計、資料持久化和整合流程

## 故障排除

### 常見問題
1. **Firebase 模組解析**: 在 `next.config.mts` 中使用 fallbacks 處理
2. **建構錯誤**: 確保在根目錄和 functions 目錄中都已安裝所有相依套件
3. **身份驗證問題**: 檢查 Firebase 組態和使用者權限
4. **部署**: 根據變更類型使用適當的部署指令 (hosting vs functions)

### 本地開發設定
1. 安裝相依套件: `npm install`
2. 安裝 function 相依套件: `npm run install:functions`
3. 設定 Firebase 憑證
4. 啟動開發伺服器: `npm run dev`
5. 在 `http://localhost:8080` 存取應用程式

## 🚀 **最新系統更新 (2024年8月)**

### 全新庫存管理系統已部署完成

**新增功能:**
1. **統計卡片區** - 4個漸變色統計卡片顯示關鍵庫存指標
2. **智能庫存表格** - 支援物料/香精切換、即時搜尋、一鍵快速調整
3. **模態化操作** - 低庫存警告、快速更新、生產能力評估
4. **現代化設計** - 專業視覺風格，大量使用顏色和動畫效果

**新增元件架構:**
```
src/app/dashboard/inventory/
├── page.tsx                    # 🆕 重新設計的主頁面
└── components/
    ├── InventoryOverviewCards.tsx    # 統計卡片區
    ├── InventoryTable.tsx           # 智能庫存表格
    ├── QuickUpdateDialog.tsx        # 快速更新對話框
    ├── LowStockDialog.tsx          # 低庫存項目對話框
    └── ProductionCapacityDialog.tsx # 生產能力評估工具
```

**後端支援:**
- 3個新的 Firebase Functions 已部署
- 增強的錯誤處理和日誌記錄
- 完整的庫存記錄稽核軌跡

**技術修復:**
- 解決了5個報告的庫存系統錯誤
- 新增 Skeleton 組件支援載入狀態
- 完善的 TypeScript 類型定義

**訪問新系統:** `http://localhost:8080/dashboard/inventory`

## 🚀 **系統功能優化與改進 (2024年8月31日)**

### 系統優化項目清單

**1. 側邊欄導航優化**
- ❌ **移除功能**: 刪除「報表分析」和「個人資料」頁面
- 🔧 **影響範圍**: `src/app/dashboard/layout.tsx`
- 📁 **清理檔案**: 移除對應的頁面目錄和檔案

**2. 供應商管理介面重新設計**
- 🆕 **新介面設計**: 從卡片式佈局改為專業表格式佈局
- 🔍 **搜尋功能**: 支援按供應商名稱、產品、聯繫窗口、聯絡人搜尋
- 📱 **響應式設計**: 桌面顯示表格，行動裝置顯示清單式佈局
- 🔧 **影響檔案**: `src/app/dashboard/suppliers/page.tsx` 完全重寫

**3. 採購單功能全面升級**
- 💰 **價格編輯**: 支援即時修改採購項目單價
- 🔢 **數量輸入**: 將增減按鈕改為直接數字輸入框
- 🔒 **狀態鎖定**: 採購單入庫後自動鎖定編輯功能（僅保留留言功能）
- 💾 **即時儲存**: 修改後即時同步到 Firestore 資料庫
- 🔧 **影響檔案**: `src/app/dashboard/purchase-orders/[id]/page.tsx`

**4. 香精供應商篩選優化**
- 🏢 **智能篩選**: 編輯香精時，供應商選項僅顯示名稱包含「生技」的公司
- 🔧 **影響檔案**: `src/app/dashboard/fragrances/FragranceDialog.tsx`

**5. 匯入匯出功能智能化升級**
- 🧠 **智能匹配**: 根據代號自動判斷新增或更新模式
- ✅ **更新模式**: 代號存在時，覆蓋更新現有資料
- 🆕 **新增模式**: 代號不存在時，依系統規則新增資料並自動生成代號
- 📊 **處理結果**: 完整的新增/更新統計報告
- 🔧 **影響檔案**: 
  - `src/app/dashboard/fragrances/page.tsx` (已有智能匹配)
  - `src/app/dashboard/materials/page.tsx` (新增智能匹配)

### 技術改進重點

**前端優化**
- 🎨 **UI/UX 一致性**: 統一所有管理頁面的視覺設計語言
- 📱 **行動裝置支援**: 所有功能完整支援手機和平板操作
- 🚀 **效能優化**: 採用批次處理和分頁載入提升大量資料處理效能

**後端整合**
- 🔥 **Firebase Functions**: 新增智能匹配所需的後端函數
- 📝 **資料驗證**: 強化匯入資料的格式驗證和錯誤處理
- 🔄 **即時同步**: 確保前端修改即時反映到資料庫

**使用者體驗提升**
- 📋 **表單設計**: 所有編輯介面採用直觀的表單設計
- 🔔 **即時反饋**: 操作完成後提供明確的成功/錯誤提示
- 💡 **智能提示**: 匯入匯出功能提供清楚的操作說明和範例

### 新增或修改的主要檔案

```
src/app/dashboard/
├── layout.tsx                    # 🔧 側邊欄優化
├── suppliers/page.tsx            # 🆕 完全重寫表格式介面  
├── purchase-orders/[id]/page.tsx # 🔧 採購單功能升級
├── fragrances/
│   ├── FragranceDialog.tsx       # 🔧 供應商篩選
│   └── page.tsx                  # ✅ 智能匯入匯出 (已存在)
└── materials/page.tsx            # 🆕 新增智能匹配邏輯
```

**完成狀態**: ✅ 所有 5 項功能需求已完成實作並測試

## 🔧 **庫存管理系統修復 (2024年8月31日)**

### 修復項目清單

**1. 低庫存項目判定邏輯修復**
- **問題**: 所有未設定低庫存閾值的項目都被標示為低庫存
- **解決方案**: 修改後端邏輯，只有設定了 `minStock > 0` 且當前庫存低於閾值的項目才會被判定為低庫存
- **影響範圍**: `functions/src/api/inventory.ts` 中的三個函數
  - `getInventoryOverview` - 統計總覽
  - `getLowStockItems` - 低庫存項目清單

**2. 生產力評估工具搜尋功能優化**
- **問題**: 產品下拉選單無法搜尋，不易查找特定產品
- **解決方案**: 將 Select 組件替換為 Combobox，支援按產品名稱、代碼和系列名稱搜尋
- **新增組件**: `src/components/ui/popover.tsx`
- **影響檔案**: `src/app/dashboard/inventory/components/ProductionCapacityDialog.tsx`

**3. 生產力評估物料需求計算重構**
- **問題**: 物料需求計算沒有反應，缺乏核心配方邏輯
- **解決方案**: 完全重寫計算邏輯，參考工單管理系統的實作
- **新增功能**: 
  - 完整的香精配方比例計算
  - 核心液體需求計算（香精、PG、VG、尼古丁）
  - 專屬材料和通用材料需求計算
  - 智能優先級排序顯示
- **影響檔案**: `src/app/dashboard/inventory/components/ProductionCapacityDialog.tsx`

**4. 庫存調整動作類型統一**
- **問題**: 庫存調整產生多種不同的動作類型記錄
- **解決方案**: 統一所有庫存調整動作為「直接修改」(`direct_modification`)
- **影響範圍**: `functions/src/api/inventory.ts` 中的兩個函數
  - `adjustInventory` - 手動調整庫存
  - `quickUpdateInventory` - 快速更新庫存

### 技術改進

**後端 Firebase Functions 優化**
- 改善低庫存檢測演算法，減少不必要的警告
- 統一庫存記錄的動作類型，簡化稽核軌跡

**前端 UI/UX 改進**
- 新增 Popover 和 Command 組件支援
- 改善生產力評估工具的使用體驗
- 優化搜尋和過濾功能

**系統穩定性提升**
- 修復生產需求計算的關鍵錯誤
- 完善錯誤處理和日誌記錄
- 統一數據模型和接口定義
- 所有改動都考慮手機板UI要跟著改動