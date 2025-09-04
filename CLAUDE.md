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
│   ├── dashboard/          # 主要應用程式儀表板
│   │   ├── page.tsx        # 工作台（主儀表板）
│   │   ├── inventory/      # 庫存監控系統
│   │   ├── materials/      # 原料庫管理
│   │   ├── fragrances/     # 配方庫管理
│   │   ├── products/       # 產品目錄
│   │   ├── purchase-orders/ # 採購訂單
│   │   ├── work-orders/    # 生產工單
│   │   ├── inventory-records/ # 庫存歷史
│   │   ├── suppliers/      # 供應商管理
│   │   ├── personnel/      # 成員管理
│   │   ├── time-records/   # 個人工時統計
│   │   └── time-reports/   # 全公司工時報表
├── components/             # 可重用的 React 元件
│   └── ui/                # Radix UI 基礎元件
├── lib/                   # 工具函式庫
├── context/               # React contexts (AuthContext 等)
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

## 核心系統功能

### 1. 庫存管理系統
- **統計卡片**: 總物料數、總香精數、總成本統計
- **智能表格**: 可切換物料/香精顯示，即時搜尋
- **快速操作**: 低庫存警告、快速調整、生產能力評估
- **稽核軌跡**: 完整的庫存變更記錄

### 2. 全域購物車系統
- **Firestore 整合**: 使用 `globalCart` 集合，支援跨裝置同步
- **即時同步**: 使用 Firestore onSnapshot 實現即時更新
- **統一介面**: 透過 `useGlobalCart` hook 統一管理

### 3. 工單與工時管理
- **生產工單**: BOM 自動計算、配方管理
- **工時記錄**: 使用 `timeEntries` 集合存儲（小時制）
- **雙重統計**: 個人工時統計和全公司工時報表
- **批量操作**: 支援批量新增和編輯工時

### 4. 權限管理系統
- **三級權限**: 系統管理員、生產領班、計時人員
- **動態導航**: 根據權限動態顯示側邊欄功能
- **前後端驗證**: 前端 UI 控制 + Firebase Functions 權限檢查

## 🚨 AI 助理必讀：關鍵部署規則

**⚠️ 絕對不能忽略的部署原則**

### 🔴 強制執行規則
**每次程式碼修改後，AI 助理必須主動提醒並執行完整部署流程！**

1. **程式碼提交 ≠ 線上更新**：
   - Git commit 只是本地版本控制
   - 用戶看到的線上版本不會自動更新
   - **必須執行 `npm run deploy` 才會生效**

2. **部署檢查責任**：
   - AI 助理有責任確認每次修改都正確部署
   - 修改完成後必須主動詢問是否要部署
   - 不能假設用戶知道需要部署

3. **部署驗證義務**：
   - 部署完成後提醒用戶清除瀏覽器快取
   - 建議用戶測試修改的功能
   - 確認線上版本與本地版本一致

### ⚠️ 常見部署陷阱（AI 助理務必避免）
1. **錯誤假設**：以為程式碼修改會自動反映到線上
2. **忽略 .next 資料夾**：SSR 需要建構產物才能運行
3. **跳過部署驗證**：沒有確認線上功能是否正常
4. **Windows 環境問題**：使用了不相容的複製指令

### 📋 部署檢查清單
- [ ] 程式碼已提交：`git add . && git commit -m "描述"`
- [ ] 本地建構成功：`npm run build`
- [ ] 檢查 .next 資料夾存在：`ls -la .next`
- [ ] 複製建構產物：`cp -r .next functions/`
- [ ] 執行完整部署：`npm run deploy`
- [ ] 確認部署成功：檢查 Firebase console 或測試線上功能
- [ ] 清除瀏覽器快取測試：Ctrl+F5 或無痕模式

### ⚡ 緊急修復部署問題
如果遇到部署問題：
1. 檢查 `.next` 資料夾是否存在：`ls -la`
2. 重新建構：`npm run build`
3. 使用修復腳本：`node scripts/copy-build.js`
4. 編譯 functions：`cd functions && npm run build && cd ..`
5. 強制部署：`firebase deploy --force`

### 📁 .next 資料夾管理策略
**重要決策：`.next` 資料夾不納入版本控制**

**原因說明**：
- **檔案大小**：`.next` 資料夾通常 500MB+ 包含大量建構產物
- **建構特性**：內容因環境、時間戳記而異，不適合版本控制
- **安全考量**：可能包含環境變數等敏感資訊
- **最佳實務**：業界標準做法是排除建構產物

**部署流程**：
1. 本地建構：`npm run build` 產生 `.next` 資料夾
2. 複製到 functions：透過 `scripts/copy-build.js` 處理
3. 部署後 functions 執行：Firebase Functions 載入 `.next` 運行 SSR
4. 清理：可以安全刪除本地 `.next`，不影響線上版本

## 開發指令

### 主專案指令
```bash
# 開發環境
npm run dev                 # 啟動開發伺服器 (port 3000)

# 建構與部署
npm run build               # 建構 Next.js 專案
npm run deploy              # 完整部署 (hosting + functions)
npm run deploy-only         # 僅部署 hosting
npm run deploy-full         # 完整部署 (等同 deploy)

# 程式碼品質
npm run lint                # Next.js ESLint 檢查
npm run lint:functions      # Functions ESLint 檢查

# Functions 管理
npm run install:functions   # 安裝 Functions 依賴
```

### Firebase Functions 指令
```bash
cd functions
npm run build              # 編譯 TypeScript
npm run lint               # 程式碼檢查
npm run serve              # 本地模擬器
npm run deploy             # 僅部署 functions
```

## 資料模型

### Firestore 集合設計
```typescript
// 核心業務實體
materials              # 原物料庫存
fragrances            # 香精庫存  
products              # 產品目錄
suppliers             # 供應商資訊

// 業務流程
purchase_orders       # 採購訂單
work_orders          # 生產工單
inventory_records    # 庫存變更稽核軌跡

// 人員與權限
users                # 使用者檔案
roles                # 角色定義
permissions          # 權限配置
timeEntries          # 工時記錄 (新版，小時制)

// 系統功能
globalCart           # 全域購物車
```

### 詳細資料結構

#### 核心實體欄位定義
```typescript
// 原料（Material）
interface Material {
  id: string;                    // 唯一識別碼
  code: string;                  // 料號（自動生成 M001, M002...）
  name: string;                  // 原料名稱
  currentStock: number;          // 當前庫存
  unit: string;                  // 單位（ml, g, 個等）
  minStock: number;              // 最低庫存警戒線
  maxStock: number;              // 最高庫存上限
  costPerUnit: number;           // 單位成本
  category?: string;             // 原料分類
  supplierId?: string;           // 供應商ID
  supplierName?: string;         // 供應商名稱
  isActive: boolean;             // 是否啟用
  createdAt: Timestamp;          // 建立時間
  updatedAt: Timestamp;          // 更新時間
}

// 香精（Fragrance）
interface Fragrance {
  id: string;                    // 唯一識別碼
  code: string;                  // 料號（自動生成 F001, F002...）
  name: string;                  // 香精名稱
  currentStock: number;          // 當前庫存
  unit: string;                  // 單位
  minStock: number;              // 最低庫存警戒線
  maxStock: number;              // 最高庫存上限
  costPerUnit: number;           // 單位成本
  category?: string;             // 香精分類
  series?: string;               // 香精系列
  supplierId?: string;           // 供應商ID（限「生技」公司）
  supplierName?: string;         // 供應商名稱
  isActive: boolean;             // 是否啟用
  createdAt: Timestamp;          // 建立時間
  updatedAt: Timestamp;          // 更新時間
}

// 產品（Product）
interface Product {
  id: string;                    // 唯一識別碼
  code: string;                  // 產品代碼
  name: string;                  // 產品名稱
  seriesId?: string;             // 產品系列ID
  seriesName?: string;           // 產品系列名稱
  // ... 其他產品屬性
}
```

#### 關聯性說明
```typescript
// 產品系列關係
Product.seriesId → ProductSeries.id
Product.seriesName → ProductSeries.name

// 供應商關係
Material.supplierId → Supplier.id
Fragrance.supplierId → Supplier.id (限制：名稱包含「生技」)

// 工時記錄關係（新版）
TimeEntry.workOrderId → WorkOrder.id
TimeEntry.employeeId → Personnel.id
// 注意：舊版 workOrder.timeRecords 已廢棄，統一使用 timeEntries 集合
```

#### 權限系統資料結構
```typescript
// 使用者檔案
interface User {
  uid: string;                   // Firebase Auth UID
  email: string;                 // 電子信箱
  employeeNumber: string;        // 員工編號
  name: string;                  // 姓名
  roleId?: string;               // 角色ID
  department?: string;           // 部門
  position?: string;             // 職位
  isActive: boolean;             // 是否啟用
}

// 角色定義
interface Role {
  id: string;                    // 角色ID
  name: string;                  // 角色名稱
  description: string;           // 角色描述
  permissions: string[];         // 權限陣列
  isActive: boolean;             // 是否啟用
}
```

## 開發規範

### 狀態管理
- **驗證狀態**: React Context (`AuthContext`)
- **全域購物車**: Firestore + `useGlobalCart` hook
- **即時資料**: Firestore onSnapshot 訂閱

### UI 設計原則
- **設計系統**: Radix UI + Tailwind CSS
- **色彩主題**: 橘色/藍色漸變系統
- **響應式**: 行動優先設計
- **暗色模式**: next-themes 支援

### 響應式設計規範

#### Tailwind CSS 斷點定義
```css
/* Tailwind 預設斷點 */
sm: 640px   /* 手機橫向 */
md: 768px   /* 平板直向 */
lg: 1024px  /* 平板橫向/小筆電 */
xl: 1280px  /* 桌面電腦 */
2xl: 1400px /* 大型桌面電腦 */
```

#### 設備適配策略
```typescript
// 桌面版 (lg: 1024px+)
- 側邊欄固定展開
- 表格完整顯示所有欄位
- 統計卡片 4 欄排列
- 模態對話框較大尺寸

// 平板版 (md: 768px - lg: 1024px)
- 側邊欄可摺疊
- 表格隱藏次要欄位
- 統計卡片 2 欄排列
- 表單適中間距

// 手機版 (< md: 768px)
- 抽屜式導航
- 卡片式資料展示
- 統計卡片單欄排列
- 觸控最佳化按鈕
```

#### 常用響應式模式
```tsx
// 條件式渲染
{isDesktop ? <DataTable /> : <MobileCardList />}

// Tailwind 響應式類別
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// 響應式隱藏/顯示
<th className="hidden lg:table-cell">詳細資訊</th>
<Button className="w-full md:w-auto">送出</Button>
```

### 程式碼品質
- **型別安全**: 完整的 TypeScript 類型定義在 `src/types/`
- **元件架構**: 可重用元件在 `src/components/ui/`
- **效能優化**: useMemo、useCallback 適當使用
- **錯誤處理**: 統一的錯誤處理機制

### 程式碼使用規範

#### 標準 Hook 使用模式
```tsx
// 權限檢查
const { canAccess, isAdmin, hasPermission } = usePermission();

// 使用範例
if (!canAccess('/dashboard/materials')) {
  return <div>無權限存取</div>;
}

// 身份驗證
const { user, isAuthenticated, login, logout } = useAuth();

// 全域購物車
const { 
  cartItems, 
  cartItemCount, 
  addToCart, 
  removeFromCart, 
  clearCart 
} = useGlobalCart();
```

#### 錯誤處理標準模式
```tsx
// 統一錯誤處理
import { toast } from 'sonner';

try {
  const result = await firebaseFunction();
  toast.success('操作成功');
} catch (error) {
  console.error('操作失敗:', error);
  toast.error(error.message || '操作失敗，請稍後再試');
}

// Loading 狀態處理
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    // ... 執行操作
  } finally {
    setIsLoading(false);
  }
};
```

#### 表單驗證標準
```tsx
// 使用 react-hook-form + zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, '名稱為必填'),
  email: z.string().email('請輸入有效的電子信箱'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

#### Firebase Functions 調用模式
```tsx
// 標準調用方式
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const addToGlobalCart = httpsCallable(functions, 'addToGlobalCart');

const handleAddToCart = async (item: CartItem) => {
  try {
    await addToGlobalCart(item);
    toast.success('已加入購物車');
  } catch (error) {
    toast.error('加入購物車失敗');
  }
};
```

#### 權限控制元件使用
```tsx
// 權限控制包裝器
<PermissionGate permission="materials.manage">
  <Button onClick={handleEdit}>編輯</Button>
</PermissionGate>

// 管理員專用元件
<AdminOnly>
  <Button onClick={handleDeleteAll}>全部刪除</Button>
</AdminOnly>

// 角色限制
<RoleGate roles={['admin', 'supervisor']}>
  <ManagementPanel />
</RoleGate>
```

### 重要開發注意事項

1. **購物車系統**: 統一使用 Firestore 全域購物車，避免 localStorage
2. **工時記錄**: 使用新版 `timeEntries` 集合（小時制），避免舊版 `timeRecords`
3. **權限檢查**: 前端 UI 控制搭配後端 Firebase Functions 驗證
4. **庫存調整**: 統一使用「直接修改」(`direct_modification`) 動作類型
5. **響應式設計**: 所有功能必須支援桌面、平板、手機三種裝置
6. **工時系統修復** (2025-09-04): 
   - **第一次修復**: 修復個人工時統計查詢問題：使用 `appUser.uid` 而非 `employeeId` 查詢
   - 工單詳情頁面已具備工時記錄即時更新機制（對話框關閉時自動重新載入）
   - 增強工時系統除錯功能：新增詳細的 console 輸出以便診斷載入問題
   - **第二次修復**: 確保 personnelId 一致性，修正 TimeTrackingDialog 載入人員時使用 `userData.uid || doc.id`
   - 新增 workOrderNumber 欄位到所有工時記錄，確保資料完整性
   - 改善工時記錄建立和查詢的錯誤處理機制
7. **工時記錄清單界面優化** (2025-09-04):
   - **美化表格設計**: 重新設計工時記錄清單，改善欄位配置和視覺效果
   - **完整欄位資訊**: 優化工單編號顯示、工作日期、時間段、總工時等欄位呈現
   - **響應式設計**: 實現桌面版 (lg)、平板版 (md-lg) 和手機版的三層響應式佈局
   - **視覺層次**: 使用漸變色彩、邊框設計和圖示增強視覺體驗
   - **互動優化**: 改善展開/收合功能，增加更多工時詳細資訊
8. **工單刪除級聯功能** (2025-09-04):
   - **新增 deleteWorkOrder 函數**: 在 Firebase Functions 中實現工單刪除功能
   - **級聯刪除邏輯**: 刪除工單時自動刪除相關的工時記錄 (timeEntries 和 workOrderTimeRecords)
   - **安全檢查**: 僅允許刪除未開始或已取消狀態的工單，保護進行中或已完工的工單
   - **事務性操作**: 使用 Firestore transaction 確保所有刪除操作的原子性
   - **詳細日誌**: 記錄刪除操作的詳細資訊，便於系統維護和除錯
9. **工時記錄清單緊湊化設計** (2025-09-04):
   - **緊湊表格設計**: 大幅縮減行高和間距，將原本過於稀疏的佈局改為緊湊設計
   - **分頁功能**: 實現每頁顯示10筆記錄的分頁系統，包含頂部和底部分頁控制
   - **智能分頁導航**: 提供首頁、末頁、上下頁和頁碼快速跳轉功能
   - **三層響應式佈局**: 
     - 桌面版(lg+): 緊湊表格形式，py-3間距，小尺寸圖示和文字
     - 平板版(md-lg): 卡片式佈局，保持資訊密度
     - 手機版(<md): 摺疊式卡片，點擊展開詳細資訊
   - **視覺優化**: 使用更小的字體(text-xs, text-sm)和圖示(h-3 w-3)，提高資訊密度
   - **狀態指示**: emoji 和顏色編碼的狀態顯示(🔒已鎖定、✅正常)
10. **工時記錄業務邏輯優化** (2025-09-04):
   - **業務規則實現**: 只顯示已完工(完工)和已入庫(入庫)狀態工單的工時記錄
   - **新增 Firebase Functions**: 
     - `getPersonalValidTimeRecords`: 獲取個人有效工時記錄，自動過濾工單狀態
     - `cleanupInvalidTimeRecords`: 清理無效工時記錄（沒有對應工單的測試資料）
   - **前端業務邏輯**:
     - 移除直接 Firestore 查詢，改用專門的 Firebase Function
     - 清理功能 UI：紅色警告按鈕，確認對話框，動畫載入狀態
     - 業務規則說明：藍色資訊卡片解釋顯示規則
   - **資料完整性**:
     - 過濾「預報」和「進行中」工單的工時記錄
     - 自動清理孤立的工時記錄（無對應工單）
     - 統計數據只計算有效工時記錄
   - **用戶體驗**:
     - Toast 通知顯示過濾結果統計
     - 清晰的業務規則說明文字
     - 管理功能與一般查看功能分離
11. **工時統計計算修復** (2025-09-04):
   - **修復 NaN 顯示問題**: 修正工時統計中出現 "NaN 小時 NaN 分鐘" 的計算錯誤
   - **計算邏輯修正**: 
     - 修正 `duration` 重複轉換問題（之前誤將小時乘以 60 轉分鐘，然後又除以 60）
     - `duration` 欄位已經是小時單位，直接累加即可
     - 使用 `Math.floor(totalWorkHours)` 和 `Math.floor((totalWorkHours % 1) * 60)` 正確計算小時和分鐘
   - **界面優化**: 移除完工總結下方的庫存統計摘要，簡化界面
   - **統一顯示**: 使用 `totalHours` 和 `totalMinutes` 變數統一各處工時顯示格式
12. **建立工單頁面產品選擇功能升級** (2025-09-04):
   - **可搜尋產品選擇**: 從基本 Select 組件升級為 Command + Popover 的 Combobox 組件
   - **多欄位智能搜尋**:
     - 支援搜尋產品名稱
     - 支援搜尋產品系列名稱  
     - 支援搜尋產品代號
     - 使用 `value={product.name} ${product.code} ${product.seriesName || ''}` 實現多欄位匹配
   - **用戶體驗優化**:
     - 保持原有視覺設計風格和樣式
     - 搜尋提示文字：「搜尋產品名稱、系列或代號...」
     - 選中狀態顯示勾選圖示，清楚標示當前選擇
     - 產品顯示格式：[系列名稱] - 產品名稱，副標題顯示產品代號
     - 支援鍵盤導航和無障礙功能
   - **技術實現**: 使用 Shadcn UI 的 Command, Popover 組件，保持與現有設計系統一致

13. **工時記錄時間衝突檢測系統** (2025-09-04):
   - **智能時間重疊檢測**: 實現精確的時間重疊算法，防止同一人員在同一時間段有多筆工時記錄
   - **跨日處理支援**: 正確處理夜班跨日情況的時間衝突檢測（如 20:00-翌日05:00）
   - **即時衝突警告**:
     - 使用 useEffect + debounce 技術，在用戶輸入時間時即時檢查衝突
     - 500ms 防抖延遲避免過度頻繁的資料庫查詢
     - 動態顯示衝突警告卡片，包含詳細的衝突資訊和建議
   - **完整的衝突阻擋機制**:
     - 單一新增模式：檢測選定人員的時間衝突
     - 批量新增模式：同時檢測所有選中人員的時間衝突
     - 有衝突時禁用新增按鈕並顯示灰色樣式
   - **友善的錯誤提示**:
     - 顯示衝突人員姓名、現有工時時間和所屬工單
     - 提供具體的解決建議（調整時間或更換人員）
     - 使用 Toast 通知顯示詳細的衝突資訊
   - **技術實現**:
     - `checkTimeOverlap()`: 核心時間重疊判定函數
     - `checkTimeConflict()`: Firebase 查詢現有工時記錄並比對衝突
     - 完整的錯誤處理和容錯機制
     - 修復 ESLint useEffect 依賴警告

## 業務邏輯說明

### BOM（物料清單）計算邏輯
```typescript
// 配方計算順序
1. 基礎液體計算
   - 香精用量 = 總量 × 香精比例
   - PG用量 = 總量 × PG比例  
   - VG用量 = 總量 × VG比例
   - 尼古丁用量 = 根據目標濃度計算

2. 專屬材料計算
   - 依據產品配方中定義的專屬材料
   - 按比例或固定用量計算

3. 通用材料計算
   - 包裝材料（瓶子、標籤等）
   - 按生產數量計算所需數量
```

### 工時計算規則
```typescript
// 工時統計規則
interface TimeCalculation {
  正常工時: number;      // <= 8 小時
  加班工時: number;      // > 8 小時的部分
  總工時: number;        // 正常工時 + 加班工時
}

// 計算邏輯
const calculateWorkHours = (duration: number) => {
  const normalHours = Math.min(duration, 8);
  const overtimeHours = Math.max(duration - 8, 0);
  return { normalHours, overtimeHours, totalHours: duration };
};
```

### 庫存調整業務規則
```typescript
// 庫存動作類型
enum InventoryAction {
  DIRECT_MODIFICATION = 'direct_modification',    // 直接修改（統一使用）
  PURCHASE_RECEIVED = 'purchase_received',        // 採購入庫
  PRODUCTION_CONSUMED = 'production_consumed',    // 生產消耗
  PRODUCTION_OUTPUT = 'production_output',        // 生產產出
}

// 低庫存判定邏輯
const isLowStock = (item: Material | Fragrance) => {
  return item.minStock > 0 && item.currentStock < item.minStock;
};
```

### 採購車跨裝置同步機制
```typescript
// 同步流程
1. 本地操作 → 立即更新 UI
2. Firestore 寫入 → 後端驗證
3. onSnapshot 監聽 → 跨裝置同步
4. 錯誤處理 → 回滾本地狀態

// 實作模式
const syncCartItem = async (action: 'add' | 'update' | 'remove', item: CartItem) => {
  // 樂觀更新
  updateLocalState(action, item);
  
  try {
    // 後端同步
    await firebaseFunction(action, item);
  } catch (error) {
    // 錯誤回滾
    revertLocalState(action, item);
    toast.error('同步失敗，請重試');
  }
};
```

## UI/UX 設計系統

### 漸變色彩系統
```css
/* 主要漸變色彩 */
.gradient-orange-blue {
  background: linear-gradient(135deg, #f59e0b 0%, #3b82f6 100%);
}

.gradient-card {
  background: linear-gradient(135deg, #fbbf24 0%, #60a5fa 100%);
}

/* 狀態色彩 */
.success-gradient { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.warning-gradient { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.error-gradient { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
```

### 標準元件設計模式
```tsx
// 統計卡片標準格式
<Card className="relative overflow-hidden">
  <div className="absolute inset-0 gradient-orange-blue opacity-10" />
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">標題</CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">數值</div>
    <p className="text-xs text-muted-foreground">描述文字</p>
  </CardContent>
</Card>

// 資料表格 vs 卡片模式
{isDesktop ? (
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
  </Table>
) : (
  <div className="space-y-4">
    {items.map(item => (
      <Card key={item.id}>...</Card>
    ))}
  </div>
)}
```

### 載入狀態設計
```tsx
// Skeleton 載入模式
import { Skeleton } from "@/components/ui/skeleton";

const LoadingCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-4 w-[100px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[60px] mb-2" />
          <Skeleton className="h-3 w-[120px]" />
        </CardContent>
      </Card>
    ))}
  </div>
);
```

### 行動裝置最佳化原則
```scss
// 觸控最佳化
.touch-target {
  min-height: 44px;    // iOS 建議最小觸控尺寸
  min-width: 44px;
  padding: 12px 16px;
}

// 手機版間距
.mobile-spacing {
  @media (max-width: 768px) {
    padding: 16px;
    margin: 8px 0;
  }
}

// 安全區域支援
.safe-area {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

## 系統整合模式

### Firestore 即時訂閱模式
```tsx
// 標準 onSnapshot 使用模式
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

useEffect(() => {
  const q = query(
    collection(db, 'materials'),
    where('isActive', '==', true)
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const materials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setMaterials(materials);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

### Firebase Functions 標準調用
```tsx
// 統一的 Functions 調用模式
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const callFunction = async <T = any>(
  functionName: string,
  data?: any
): Promise<T> => {
  try {
    const func = httpsCallable(functions, functionName);
    const result: HttpsCallableResult<T> = await func(data);
    return result.data;
  } catch (error) {
    console.error(`Function ${functionName} 調用失敗:`, error);
    throw error;
  }
};

// 使用範例
const updateInventory = async (itemId: string, quantity: number) => {
  await callFunction('quickUpdateInventory', { itemId, quantity });
};
```

### 檔案上傳處理流程
```tsx
// 統一檔案上傳模式
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const uploadFile = async (
  file: File,
  path: string
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('檔案上傳失敗:', error);
    throw error;
  }
};

// 圖片壓縮和上傳
const uploadAndCompressImage = async (file: File, maxWidth = 800) => {
  // 圖片壓縮邏輯
  const compressedFile = await compressImage(file, maxWidth);
  
  // 上傳到 Firebase Storage
  const path = `images/${Date.now()}_${file.name}`;
  return await uploadFile(compressedFile, path);
};
```

### 錯誤處理和重試機制
```tsx
// 帶重試機制的 API 調用
const apiCallWithRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      console.warn(`嘗試 ${attempt} 失敗，${delay}ms 後重試...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // 指數退避
    }
  }
  throw new Error('最大重試次數已達到');
};
```

### 資料驗證和轉換
```tsx
// 統一資料驗證模式
import { z } from 'zod';

// 定義驗證 schema
const MaterialSchema = z.object({
  name: z.string().min(1, '名稱為必填'),
  currentStock: z.number().min(0, '庫存不能為負數'),
  costPerUnit: z.number().min(0, '成本不能為負數'),
});

// 驗證函數
const validateMaterial = (data: unknown) => {
  try {
    return MaterialSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors.map(e => e.message).join(', '));
    }
    throw error;
  }
};
```

## 部署流程

### 完整部署 (推薦)
```bash
npm run deploy-full
```
此指令會：
1. 建構 Next.js 專案
2. 複製建構產物到 functions 目錄
3. 編譯 Functions TypeScript
4. 部署 hosting 和 functions

### 開發部署流程
1. 本地測試: `npm run dev`
2. 建構檢查: `npm run build`
3. 程式碼檢查: `npm run lint`
4. 執行部署: `npm run deploy`

## 安全與權限實作

### 三級權限系統詳細說明
```typescript
// 權限矩陣定義
const ROLE_PERMISSIONS = {
  admin: [        // 🔴 系統管理員
    'personnel.manage',      // 成員管理
    'roles.manage',          // 權限管理
    'materials.manage',      // 原料庫管理
    'fragrances.manage',     // 配方庫管理
    'inventory.manage',      // 庫存管理
    'purchase.manage',       // 採購管理
    'workOrders.manage',     // 工單管理
    'cost.view',            // 成本分析
    'timeReports.view',     // 工時報表
    // ... 所有權限
  ],
  
  supervisor: [   // 🔵 生產領班
    'materials.view',        // 查看原料庫
    'fragrances.manage',     // 管理配方庫
    'inventory.view',        // 查看庫存
    'purchase.view',         // 查看採購
    'workOrders.manage',     // 管理工單
    'time.manage',          // 管理工時
    'timeReports.view',     // 查看工時報表
  ],
  
  employee: [     // 🟢 計時人員
    'materials.view',        // 查看原料庫
    'fragrances.view',       // 查看配方庫
    'products.view',         // 查看產品
    'workOrders.view',       // 查看工單
    'time.view',            // 查看工時
  ],
};
```

### 權限檢查實作模式
```tsx
// 前端權限控制
import { usePermission } from '@/hooks/usePermission';

const Component = () => {
  const { hasPermission, canAccess, isAdmin } = usePermission();

  // 頁面級權限檢查
  if (!canAccess('/dashboard/materials')) {
    return <UnauthorizedPage />;
  }

  return (
    <div>
      {/* 功能級權限控制 */}
      {hasPermission('materials.manage') && (
        <Button onClick={handleEdit}>編輯</Button>
      )}
      
      {/* 管理員專用功能 */}
      {isAdmin() && (
        <Button onClick={handleDelete}>刪除</Button>
      )}
    </div>
  );
};
```

### Firebase Functions 權限驗證
```typescript
// 後端權限檢查標準模式
import { checkPermission } from '../utils/auth';

export const updateMaterial = onCall(async (request) => {
  // 驗證用戶身份
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '需要登入');
  }

  // 檢查權限
  const hasPermission = await checkPermission(
    request.auth.uid, 
    'materials.manage'
  );
  
  if (!hasPermission) {
    throw new HttpsError('permission-denied', '權限不足');
  }

  // 執行業務邏輯
  // ...
});
```

### 頁面路由權限對應
```typescript
// 完整的頁面權限對應表
export const PAGE_PERMISSIONS = {
  '/dashboard': null,                           // 所有人可存取
  '/dashboard/personnel': 'personnel.view',     // 成員管理
  '/dashboard/suppliers': 'suppliers.view',     // 供應商
  '/dashboard/materials': 'materials.view',     // 原料庫
  '/dashboard/fragrances': 'fragrances.view',   // 配方庫
  '/dashboard/products': 'products.view',       // 產品目錄
  '/dashboard/purchase-orders': 'purchase.view', // 採購訂單
  '/dashboard/work-orders': 'workOrders.view',   // 生產工單
  '/dashboard/inventory': 'inventory.view',      // 庫存監控
  '/dashboard/inventory-records': 'inventoryRecords.view', // 庫存歷史
  '/dashboard/cost-management': 'cost.view',     // 成本分析
  '/dashboard/time-records': 'time.view',       // 工時統計
  '/dashboard/time-reports': 'timeReports.view', // 工時報表
  '/dashboard/personnel/permissions': 'roles.manage', // 權限管理（管理員專用）
};
```

### 權限初始化流程
```bash
# 權限系統初始化步驟
1. 登入系統管理員帳號
2. 進入「成員管理」頁面
3. 點擊「權限管理」按鈕
4. 執行「初始化預設角色」
5. 系統自動建立三種角色和完整權限配置
6. 為現有用戶分配適當角色
```

### 安全最佳實務
```typescript
// 敏感資料處理
const sanitizeUserData = (userData: any) => {
  // 移除敏感欄位
  const { password, privateKey, ...safeData } = userData;
  return safeData;
};

// API 回應過濾
const filterResponse = (data: any, userPermissions: string[]) => {
  if (!userPermissions.includes('cost.view')) {
    delete data.costPerUnit;
    delete data.totalCost;
  }
  return data;
};

// 輸入驗證
import { z } from 'zod';

const UserInputSchema = z.object({
  name: z.string().max(100).regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/),
  email: z.string().email(),
  // 防止 XSS 攻擊
}).transform(data => ({
  ...data,
  name: escapeHtml(data.name),
}));
```

## 故障排除

### 常見問題
1. **Firebase 模組解析錯誤**: 檢查 `next.config.mts` 的 webpack fallbacks
2. **建構失敗**: 確保根目錄和 functions 目錄都已安裝依賴
3. **部署失敗**: 檢查 Firebase 專案權限和 functions 區域設定
4. **權限問題**: 確認使用者角色已正確初始化

### 除錯檢查清單
- [ ] 所有依賴已安裝 (`npm install` 和 `npm run install:functions`)
- [ ] Firebase 憑證已設定
- [ ] 建構成功無錯誤 (`npm run build`)
- [ ] ESLint 檢查通過
- [ ] Firebase 專案權限正確

### 本地開發設定
1. 複製專案: `git clone <repository-url>`
2. 安裝依賴: `npm install`
3. 安裝 Functions 依賴: `npm run install:functions`
4. 設定 Firebase 憑證
5. 啟動開發伺服器: `npm run dev`
6. 開啟瀏覽器: `http://localhost:3000`

## 系統維護重點

### 權限系統維護
- 預設角色：系統管理員、生產領班、計時人員
- 權限初始化：透過成員管理頁面執行
- 權限矩陣：參考 `src/utils/permissions.ts`

### 資料庫維護
- 定期檢查 Firestore 索引使用狀況
- 監控 `timeEntries` 集合大小和查詢效能
- 清理過期的 `globalCart` 項目

### 效能監控
- 監控 Firebase Functions 執行時間
- 檢查 Next.js 建構產物大小
- 評估 Firestore 讀寫次數

此文檔專注於系統架構理解和維護指引。如需詳細的 API 文檔或元件說明，請參考程式碼內的 TypeScript 類型定義和註解。
- 修改後都先本地部署，直到我有說再推送github
- 重要：除非用戶明確說"推送到 GitHub"或"git push"，否則只能執行：
  1. `git add .`
  2. `git commit -m "..."`  
  3. 本地測試 (`npm run build`, `npm run dev`)
  4. 絕對不能執行 `git push` 命令
- 每次有修改都要檢查claude.me，確保這份檔案能正確詮釋本專案
- 每次都把運行本地的任務清除掉，避免佔用port