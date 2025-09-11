# CLAUDE.md

本檔案為 Claude Code (claude.ai/code) 在此程式碼庫中工作時提供指引。

## 專案概述

這是「鹿鹿小作坊」(Deer Lab)，一個使用 Next.js 和 Firebase 建構的全方位生產管理系統。該系統為小型製造工坊設計，管理完整的生產流程，包括庫存管理、採購、工單、人員和權限控制。

**重要：這是一個動態網站**，使用 Next.js SSR (Server-Side Rendering) 配合 Firebase Functions，並非靜態部署。

## 技術架構

### 技術堆疊
- **前端**: Next.js 14 (App Router), React 18, TypeScript
- **UI 函式庫**: Radix UI 元件配合 Tailwind CSS
- **後端**: Firebase Functions (Node.js 20)
- **資料庫**: Firestore
- **身份驗證**: Firebase Auth
- **檔案儲存**: Firebase Storage
- **部署**: Firebase Hosting + Firebase Functions (SSR)

### 部署架構說明
系統採用 **Next.js SSR + Firebase Functions** 的動態網站架構：
- Firebase Functions 運行 Next.js server (nextServer)
- 所有路由通過 Firebase Functions 處理
- 支援伺服器端渲染和 API 路由
- 使用 `firebase.json` 的 rewrites 規則將所有請求導向 nextServer 函數

### 目錄結構
```
src/
├── app/                    # Next.js App Router 頁面
│   └── dashboard/          # 主要應用程式儀表板
├── components/             # 可重用的 React 元件
│   └── ui/                # Radix UI 基礎元件
├── lib/                   # 工具函式庫
├── context/               # React contexts
├── hooks/                 # 自訂 React hooks
├── types/                 # TypeScript 類型定義
└── utils/                 # 工具函數

functions/                 # Firebase Functions
├── src/
│   ├── api/               # API 端點
│   ├── utils/             # 共用工具
│   └── index.ts           # Functions 入口
├── package.json           # Functions 依賴
└── .next/                 # 部署時的 Next.js 建構產物
```

## 🚨 AI 助理必讀：關鍵部署規則

**⚠️ 絕對不能忽略的部署原則**

### 🔴 強制執行規則
**每次程式碼修改後，AI 助理必須主動提醒並執行完整部署流程！**

1. **程式碼提交 ≠ 線上更新**：
   - Git commit 只是本地版本控制
   - 用戶看到的線上版本不會自動更新
   - **必須執行部署指令才會生效**

2. **部署檢查責任**：
   - AI 助理有責任確認每次修改都正確部署
   - 修改完成後必須主動詢問是否要部署
   - 不能假設用戶知道需要部署

### 📋 完整部署檢查清單
- [ ] **程式碼提交**：`git add . && git commit -m "描述"`
- [ ] **本地建構**：`npm run build`
- [ ] **檢查建構產物**：比較 `.next` 和 `functions/.next` 的修改時間
- [ ] **同步建構產物**：`cp -r .next functions/`
- [ ] **編譯 Functions**：`cd functions && npm run build && cd ..`
- [ ] **執行部署**：`firebase deploy --only functions:nextServer`
- [ ] **確認部署成功**：檢查 Firebase console 或測試線上功能
- [ ] **清除瀏覽器快取測試**：Ctrl+F5 或無痕模式

### 🆘 常見部署問題修復

#### 問題 1：線上網站顯示 404 錯誤
**症狀**：網站顯示 "This page could not be found"，Firebase 控制台顯示正常初始化
**原因**：本地 `.next` 建構產物沒有同步到 `functions/.next`
**修復步驟**：
```bash
# 1. 檢查時間戳記差異
ls -la .next
ls -la functions/.next

# 2. 重新同步建構產物
cp -r .next functions/

# 3. 編譯並部署 Functions
cd functions && npm run build && cd ..
firebase deploy --only functions:nextServer

# 4. 驗證部署成功
firebase functions:log
```

#### 問題 2：線上功能與本地版本不一致
**症狀**：某些功能在本地正常，但線上版本行為不同
**診斷方法**：
1. 比較本地和 functions 目錄的 `.next` 時間戳記
2. 檢查 git 狀態確認所有修改已提交
3. 查看 Firebase Functions 日誌

**修復流程**：
```bash
# 完整重新部署流程
npm run build
cp -r .next functions/
cd functions && npm run build && cd ..
firebase deploy --only functions:nextServer
```

### ⚡ 部署命令速查

```bash
# 快速部署 (推薦)
npm run build && cp -r .next functions/ && firebase deploy --only functions:nextServer

# 完整重新部署
firebase deploy

# 檢查部署狀態
firebase functions:log

# 強制重新部署 (緊急情況)
firebase deploy --force
```

### 📁 .next 資料夾管理策略
**重要決策：`.next` 資料夾不納入版本控制**

**部署流程**：
1. 本地建構：`npm run build` 產生 `.next` 資料夾
2. 複製到 functions：`cp -r .next functions/`
3. 部署：Firebase Functions 載入 `.next` 運行 SSR
4. 清理：可以安全刪除本地 `.next`，不影響線上版本

## 開發指令

### 主專案指令
```bash
# 開發環境
npm run build               # 建構 Next.js 專案 (⚠️ 不要使用 npm run dev)

# 部署
npm run deploy              # 完整部署 (hosting + functions)
firebase deploy --only functions:nextServer  # 僅部署 nextServer 函數

# 程式碼品質
npm run lint                # ESLint 檢查
```

### Firebase Functions 指令
```bash
cd functions
npm run build              # 編譯 TypeScript
npm run lint               # 程式碼檢查
```

## 核心系統功能

### 1. 統一頁面系統 (StandardDataListPage) ✅ 已全面實施
**⚠️ 重要：所有清單頁面必須使用 StandardDataListPage 元件**

- **檔案位置**: `src/components/StandardDataListPage.tsx`
- **適用範圍**: 原料庫、香精庫、產品目錄、供應商、人員管理、工單管理、採購管理等所有清單頁面
- **核心功能**: 統一的表格/卡片視圖、響應式設計、快速篩選、搜尋、分頁、統計等

#### 🎯 已完成統一架構遷移的頁面 (2024-09-11)
- ✅ **原料庫管理頁面** (`materials/page.tsx`) - 完全統一
- ✅ **香精庫管理頁面** (`fragrances/page.tsx`) - 完全統一
- ✅ **供應商管理頁面** (`suppliers/page.tsx`) - 完全統一
- ✅ **人員管理頁面** (`personnel/page.tsx`) - 完全統一 + 權限顏色全局化
- ✅ **工單管理頁面** (`work-orders/page.tsx`) - 完全統一 + 保留分頁機制
- ✅ **採購管理頁面** (`purchase-orders/page.tsx`) - 清單區域統一 + 複雜功能保留

#### 📊 統計卡片全局優化特性
- **層次化字體設計**: 標題 `text-base`→`text-lg`，數值 `text-2xl`→`text-3xl`，副標題 `text-xs`→`text-sm`
- **響應式適配**: 桌面與手機版字體自動調適，視覺層次更清晰
- **統一顏色系統**: 支援 `blue`、`green`、`yellow`、`red`、`purple`、`orange` 六種主題色彩

### 2. 統一對話框系統 (StandardFormDialog)
**⚠️ 重要：所有CRUD對話框必須使用 StandardFormDialog 元件與統一載入機制**

- **檔案位置**: `src/components/StandardFormDialog.tsx`
- **載入機制**: `src/hooks/useFormDataLoader.ts`
- **適用範圍**: MaterialDialog、SupplierDialog、ProductDialog 等所有表單對話框
- **詳細說明**: 參考 `統一對話框載入機制使用指南.md`

#### 統一載入機制使用方式
```tsx
<StandardFormDialog<FormData>
  // ... 基本屬性
  dataLoaderConfig={{
    loadSuppliers: true,           // 載入供應商資料
    loadMaterialCategories: true,  // 載入物料主分類
    loadMaterialSubCategories: true, // 載入物料細分分類
    loadUsers: true,               // 載入使用者資料
    loadProducts: true,            // 載入產品資料
  }}
  // ... 其他屬性
/>
```

#### 智能選項生成
系統會根據欄位名稱自動提供對應的選項資料：
- `supplierId`, `*supplier*` → 供應商選項（含"無供應商"）
- `category`, `*Category` → 主分類選項
- `subCategory`, `*SubCategory` → 細分分類選項
- `*person*`, `*user*` → 使用者選項

#### 載入機制優勢
- **完全統一化**：所有對話框使用相同架構
- **絕不卡住**：穩定的並行載入，避免無限載入問題
- **智能化**：根據欄位名稱自動匹配資料
- **高效能**：只載入需要的資料類型
- **易維護**：統一的載入邏輯，減少重複程式碼

### 3. 快速篩選標籤系統
#### 快速篩選標籤重要規則
```typescript
interface QuickFilter {
  key: string;           // 篩選欄位名稱
  label: string;         // 🚨 關鍵：此內容會直接顯示在標籤上
  value: any;           // 篩選值
  count?: number;       // 項目數量
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';
}

// 使用範例：主分類和細分分類分開顯示
const quickFilters = [
  // 主分類標籤 - 統一藍色
  { key: 'categoryName', label: '紙盒', value: '紙盒', color: 'blue' },
  { key: 'categoryName', label: '通用材料', value: '通用材料', color: 'blue' },
  
  // 細分分類標籤 - 統一綠色  
  { key: 'subCategoryName', label: '彩盒', value: '彩盒', color: 'green' },
  { key: 'subCategoryName', label: '鋁箔袋', value: '鋁箔袋', color: 'green' },
];
```

### 4. 供應商資料處理
原料和香精的供應商資料支援多種格式：

```typescript
// 供應商資料解析優先順序
1. supplierName (直接字串)
2. supplierId (ID 查找)
3. supplierRef.id (Firebase DocumentReference)
4. supplier (其他格式)
```

### 5. 權限管理系統
- **三級權限**: 系統管理員、生產領班、計時人員
- **前後端驗證**: 前端 UI 控制 + Firebase Functions 權限檢查

## 資料模型

### 核心 Firestore 集合
```typescript
materials              # 原物料庫存
fragrances            # 香精庫存  
products              # 產品目錄
suppliers             # 供應商資訊
purchase_orders       # 採購訂單
work_orders          # 生產工單
timeEntries          # 工時記錄 (新版，小時制)
users                # 使用者檔案
roles                # 角色定義
globalCart           # 全域購物車
```

### 供應商資料欄位
```typescript
interface Material {
  // 供應商資料支援多種格式
  supplierName?: string;        // 直接供應商名稱
  supplierId?: string;          // 供應商 ID  
  supplierRef?: DocumentRef;    // Firebase 文檔引用
  supplier?: any;              // 其他供應商格式
}
```

## 開發規範

### 統一對話框開發規範
1. **必須使用 StandardFormDialog**：所有CRUD對話框都必須使用統一架構
2. **使用 dataLoaderConfig**：根據需要配置資料載入，不要手動載入
3. **智能欄位命名**：使用語義化欄位名稱以利智能選項匹配
4. **靜態表單配置**：formSections 使用空依賴陣列，避免無限重渲染
5. **參考使用指南**：詳細使用方式請參考 `統一對話框載入機制使用指南.md`

### 響應式設計
```css
/* Tailwind CSS 斷點 */
sm: 640px   /* 手機橫向 */
md: 768px   /* 平板直向 */
lg: 1024px  /* 平板橫向/小筆電 */
xl: 1280px  /* 桌面電腦 */
```

### 標準 Hook 使用
```tsx
// 權限檢查
const { hasPermission, canAccess } = usePermission();

// 全域購物車
const { cartItems, addToCart } = useGlobalCart();

// 統一搜尋
const { filteredData, setSearchTerm } = useDataSearch(data, searchConfig);
```

### 錯誤處理
```tsx
import { toast } from 'sonner';

try {
  await firebaseFunction();
  toast.success('操作成功');
} catch (error) {
  toast.error(error.message || '操作失敗');
}
```

## 故障排除

### 常見問題
1. **Firebase 模組解析錯誤**: 檢查 `next.config.mts`
2. **建構失敗**: 確保依賴已安裝 (`npm install`)
3. **部署失敗**: 檢查 Firebase 專案權限
4. **線上版本不一致**: 檢查 `.next` 建構產物同步

### 供應商資料除錯
如果供應商顯示為"未指定"：
1. 檢查 console 除錯資訊
2. 確認 supplierRef 欄位格式
3. 驗證供應商集合資料

### AI 助理開發指引 🤖

#### 統一架構優先原則
1. **清單頁面開發**：
   - 🎯 **優先使用** StandardDataListPage 元件 
   - 📋 檢查現有配置：columns、actions、quickFilters、stats
   - 🔄 參考已完成的頁面模式：personnel、work-orders、purchase-orders
   
2. **對話框開發**：
   - 🎯 **必須使用** StandardFormDialog + dataLoaderConfig 統一載入機制
   - 🚫 **禁止手動載入**：避免無限載入和性能問題
   - 💡 **智能欄位命名**：使用語義化命名以利自動選項匹配

#### 常見問題診斷指南
3. **快速篩選標籤問題** → 檢查 `quickFilters` 的 `label` 屬性是否正確
4. **供應商資料顯示問題** → 檢查多種欄位格式處理：supplierName、supplierId、supplierRef
5. **載入卡住問題** → 確認使用 dataLoaderConfig，避免手動載入邏輯
6. **統計卡片字體問題** → 已全局優化，新頁面自動繼承層次化字體設計

#### 部署與測試要求  
7. **每次修改後必須確保線上部署同步**：`npm run build` → 部署檢查清單
8. **統一架構測試重點**：響應式佈局、搜尋篩選、統計數據、操作按鈕

## 手動備份系統

**⚠️ 重要：已完全關閉 Firebase Functions 自動備份以節省儲存成本**

### 📦 備份腳本使用方法

#### 🔧 建立備份 - `backup-functions.bat`
**執行方式**：
```cmd
# 在專案根目錄執行
D:\APP\deer-lab\backup-functions.bat
```

**腳本執行內容**：
1. **建立時間戳記備份資料夾** - 格式: `deer-lab-backup_YYYY-MM-DD_HH-NN-SS`
2. **備份程式碼** - 使用 `robocopy` 複製所有原始碼（排除 node_modules, .git, .next）
3. **備份 Firebase 設定** - 複製 `.firebaserc` 和 `firebase.json`
4. **自動建構專案** - 執行 `npm run build` 產生 `.next` 建構產物
5. **備份建構產物** - 複製 `.next` 和 `functions` 目錄（排除 node_modules）
6. **建立備份資訊檔** - 包含備份時間、Git 提交資訊、恢復說明

**備份位置**：`D:\APP\deer-lab-backups\[備份資料夾名稱]\`
**備份內容**：
```
deer-lab-backup_2025-09-11_22-30-00\
├── source\           # 完整原始碼
├── build\            # 建構產物 (.next, functions)
├── firebase_config\  # Firebase 設定檔
└── 備份說明.txt       # 詳細備份資訊與恢復指南
```

#### 🔄 恢復備份 - `restore-from-backup.bat`
**執行方式**：
```cmd
# 指定備份資料夾路径恢復
D:\APP\deer-lab\restore-from-backup.bat "D:\APP\deer-lab-backups\deer-lab-backup_2025-09-11_22-30-00"
```

**腳本執行內容**：
1. **驗證備份資料夾** - 檢查指定路径是否存在備份檔案
2. **確認恢復操作** - 提示用戶確認是否覆蓋當前檔案
3. **恢復程式碼** - 使用 `robocopy` 還原所有原始碼到專案目錄
4. **恢復設定檔** - 還原 Firebase 配置檔案
5. **自動安裝依賴** - 在主專案和 functions 目錄執行 `npm install`
6. **恢復建構產物** - 還原 `.next` 檔案或重新建構（如果備份中沒有）
7. **同步到 functions** - 確保 `functions/.next` 與主目錄同步

**恢復後動作**：
```cmd
# 恢復完成後可直接部署
firebase deploy --only functions:nextServer
```

### 💡 建議使用時機

#### 🎯 建立備份時機
1. **重大功能完成前** - 確保穩定版本
2. **準備部署新功能前** - 萬一出問題可快速回滾  
3. **週期性備份** - 每週或每兩週備份一次
4. **重要里程碑** - 專案重要階段備份

#### 🚀 快速備份流程
```cmd
# 1. 提交到 Git（主要版本控制）
git add .
git commit -m "功能完成前備份"

# 2. 建立本地備份（緊急恢復用）
backup-functions.bat

# 3. 測試部署（如果需要）
firebase deploy --only functions:nextServer
```

### 💰 成本效益
- **之前**：每次部署產生 300MB+ 備份，累積可達數十 GB
- **現在**：$0 USD 自動備份費用，完全本地控制
- **安全保障**：GitHub 版本控制 + 本地完整備份雙重保護

## 重要提醒

- **修改後先本地建構測試，確認用戶同意再推送 GitHub**
- **除非明確說"推送到 GitHub"，否則不執行 `git push`**  
- **沒得到同意前不要部署到 Firebase**
- **只執行 `npm run build`，不要執行 `npm run dev`**
- **每次修改都要檢查本 CLAUDE.md 檔案是否需要更新**