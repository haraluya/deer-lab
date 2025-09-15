# CLAUDE.md

本檔案為 Claude Code 在此程式碼庫中工作時提供指引。

## 🏗️ 系統架構認知

### 專案概述
「德科斯特的實驗室」(Dexter's Lab) - Next.js + Firebase 全方位生產管理系統

### ⚠️ 關鍵架構特性（防止誤解）
- **這是動態網站**：Next.js SSR + Firebase Functions，非靜態部署
- **部署架構**：Firebase Functions 運行 Next.js server (nextServer)
- **路由處理**：所有請求通過 firebase.json rewrites 導向 nextServer 函數

## 🚨 強制執行規則（絕對禁令）

### 1️⃣ API調用禁令
```tsx
// ❌ 絕對禁止 - 已完全廢棄
import { httpsCallable } from 'firebase/functions';

// ✅ 必須使用 - 統一API客戶端
import { useApiClient } from '@/hooks/useApiClient';
```

### 2️⃣ 統一ID系統 - AI必讀 🚨
**employeeId = Firebase Auth UID = Firestore 文檔ID = personnelId**
```typescript
// ✅ 正確：直接使用，它們完全相同
const userId = appUser.employeeId;

// ❌ 禁止：不要做任何ID映射轉換
const personnelId = await convertEmployeeIdToPersonnelId(employeeId);
```

### 3️⃣ 部署流程強制規則
**每次修改後 AI 必須主動提醒並執行部署！**
```bash
# 標準部署流程（必須使用）
npm run build
cp -r .next functions/
rm -rf functions/.next/cache  # 強制清理快取
firebase deploy --only functions:nextServer
```

## 🏛️ 統一架構系統（防止重複開發）

### A. 統一頁面系統 ✅
- **檔案**：`src/components/StandardDataListPage.tsx`
- **適用**：所有清單頁面必須使用
- **功能**：表格/卡片視圖、響應式設計、快速篩選、搜尋、統計

### B. 統一對話框系統 ✅
- **檔案**：`src/components/StandardFormDialog.tsx`
- **載入**：`src/hooks/useFormDataLoader.ts`
- **適用**：所有CRUD對話框必須使用
```tsx
<StandardFormDialog<FormData>
  dataLoaderConfig={{
    loadSuppliers: true,
    loadMaterialCategories: true,
  }}
/>
```

### C. 統一API客戶端系統 ✅
```tsx
// Hook 變體選擇
const apiClient = useApiForm();     // 表單專用
const crudClient = useApiCrud();    // CRUD專用
const silentClient = useApiSilent(); // 靜默操作
```

## 📚 技術文檔導引

### 核心技術指南
- **API開發**：[`docs/API客戶端使用指南.md`](docs/API客戶端使用指南.md)
- **UI元件**：[`docs/對話框載入機制指南.md`](docs/對話框載入機制指南.md)
- **庫存系統**：[`docs/庫存API實施紀錄.md`](docs/庫存API實施紀錄.md)
- **成本控制**：[`docs/Firebase成本優化.md`](docs/Firebase成本優化.md)

### 維護工具
- **GCS清理**：[`scripts/GCS清理指南.md`](scripts/GCS清理指南.md)
- **系統清理**：[`scripts/清理結果報告.md`](scripts/清理結果報告.md)

## 🛠️ 開發規範要點

### 快速篩選標籤規則
```typescript
interface QuickFilter {
  key: string;    // 篩選欄位
  label: string;  // 🚨 直接顯示在標籤上的內容
  value: any;     // 篩選值
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}
```

### 供應商資料處理優先順序
```typescript
1. supplierName (直接字串)
2. supplierId (ID 查找)
3. supplierRef.id (Firebase DocumentReference)
4. supplier (其他格式)
```

### 權限管理系統
- **三級權限**：系統管理員、生產領班、計時人員
- **驗證機制**：前端UI控制 + Firebase Functions權限檢查

## 🚀 部署優化要點

### 部署大小控制
- **禁止**：超過150MB的部署檔案
- **目標**：50-100MB以內
- **檢查**：`du -sh functions/.next` 確認大小

### 快取清理（強制執行）
```bash
rm -rf functions/.next/cache     # 清理快取
rm -f functions/.next/trace      # 清理追蹤檔
```

### 優化部署腳本
```bash
scripts\optimize-deploy.bat  # Windows一鍵優化部署
```

## 📋 核心資料模型

### Firestore集合
```typescript
materials       # 原物料庫存
fragrances     # 香精庫存
products       # 產品目錄
suppliers      # 供應商資訊
purchase_orders # 採購訂單
work_orders    # 生產工單
timeEntries    # 工時記錄
users          # 使用者檔案
roles          # 角色定義
globalCart     # 全域購物車
```

## ⚡ 常見誤解防範

### 部署相關
1. **程式碼提交 ≠ 線上更新**：必須執行部署指令
2. **本地 `.next` 必須同步到 `functions/.next`**
3. **每次部署前必須清理快取**

### 開發相關
1. **所有清單頁面使用 StandardDataListPage**
2. **所有對話框使用 StandardFormDialog + dataLoaderConfig**
3. **所有API調用使用 useApiClient Hook系列**
4. **用戶ID系統完全統一，禁止映射轉換**

## 🎯 AI助理開發檢查清單

### 開發前檢查
- [ ] 確認使用統一架構組件（StandardDataListPage/StandardFormDialog）
- [ ] 確認API調用使用 useApiClient Hook
- [ ] 確認用戶ID使用統一標準

### 開發後檢查
- [ ] 執行 `npm run build` 本地建構測試
- [ ] 詢問用戶是否需要線上部署
- [ ] 部署前執行快取清理
- [ ] 檢查部署檔案大小 < 150MB

## 💡 重要提醒

- **API問題必看**：`docs/API客戶端使用指南.md`
- **修改後先本地測試，確認用戶同意再部署**
- **除非用戶明確要求，否則不執行 Firebase 部署**
- **每次修改檢查是否需要更新本檔案**