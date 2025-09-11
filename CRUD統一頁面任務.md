# CRUD 統一頁面任務記錄

## 📋 任務目標

將所有 CRUD 頁面統一使用 `StandardDataListPage` 架構，實現：
1. 統一的程式碼架構和維護性
2. 一致的使用者介面和操作體驗
3. 完整的響應式設計（桌面/平板/手機版）
4. 保持原版的視覺設計和功能邏輯

## 🚀 當前進展狀況

### ✅ 已完成項目：

1. **StandardDataListPage 核心架構建立**
   - 位置：`src/components/StandardDataListPage.tsx`
   - 支援自訂卡片渲染函數 (`renderCard`)
   - 支援統計卡片、搜尋、過濾、批量操作
   - 實現桌面版表格 vs 手機版卡片的響應式切換

2. **專業響應式系統實現**
   - 使用 Flexbox + Container Queries 架構
   - 多層次溢出保護機制：
     - 容器層：`flex flex-wrap gap-4 justify-center sm:justify-start w-full overflow-hidden`
     - 包裝層：`flex-shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] min-w-0 max-w-full overflow-hidden`
     - 內容層：`w-full h-full overflow-hidden`
     - 文字層：`truncate` 類別防止文字溢出

3. **原料庫頁面 (✅ 完成)**
   - 位置：`src/app/dashboard/materials/page.tsx`
   - 成功遷移至 StandardDataListPage
   - 使用預設卡片渲染，無溢出問題
   - 桌面版表格 + 手機版卡片完美切換

4. **配方庫頁面 (✅ 完成)**
   - 位置：`src/app/dashboard/fragrances/page.tsx`
   - 使用自訂 `renderFragranceCard` 函數
   - 紫色/粉色漸變設計風格
   - **問題：桌面版設計需調整為舊版排版**

5. **供應商頁面 (✅ 完成)**
   - 位置：`src/app/dashboard/suppliers/page.tsx`  
   - 使用自訂 `renderSupplierCard` 函數
   - 藍色/綠色漸變設計風格
   - **問題：桌面版設計需調整為舊版排版**

6. **Next.js Webpack 快取問題修復**
   - 問題：`Error: Cannot find module './8948.js'`
   - 解決：清理 `.next` 資料夾 + 重新安裝依賴
   - 當前伺服器：http://localhost:3001

## ❌ 未解決問題

### 🔴 問題 1：手機版自適應尚未完全解決
**詳細描述：**
- 使用者反饋：「統一頁面手機板的自適應還沒解決」
- 可能是指特定螢幕尺寸下仍有溢出或佈局問題
- 需要在實際裝置上測試確認具體問題

**已嘗試方案：**
- ✅ 實現 Flexbox + Container Queries 響應式架構
- ✅ 添加多層次溢出保護機制
- ✅ 使用響應式寬度計算：`w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]`
- ✅ 文字截斷：`truncate` 類別
- ❓ 可能需要針對特定裝置尺寸進一步調整

**下一步行動：**
- [ ] 在實際裝置測試各個頁面
- [ ] 識別具體哪些元素仍有溢出問題
- [ ] 針對問題元素添加更嚴格的寬度限制

### 🔴 問題 2：桌面版設計需要調整為舊版排版
**影響頁面：**
- 供應商管理頁面 (`/dashboard/suppliers`)
- 配方庫管理頁面 (`/dashboard/fragrances`)

**詳細描述：**
- 目前使用 StandardDataListPage 的統一設計
- 需要將桌面版的欄位排列、間距、樣式調整為與舊版一致
- 保持手機版的統一設計，僅調整桌面版

**已嘗試方案：**
- ✅ 建立自訂卡片渲染函數
- ❌ 尚未針對桌面版表格進行舊版樣式復原

**下一步行動：**
- [ ] 檢查舊版供應商和配方庫的桌面版設計
- [ ] 在 StandardDataListPage 中添加桌面版樣式自訂選項
- [ ] 調整表格欄位、間距、顏色等視覺元素

## 📋 待完成頁面

### 🔜 下一階段需要遷移的 CRUD 頁面：

1. **產品目錄** (`/dashboard/products`)
   - 複雜度：高（大量自訂功能）
   - 預估工作量：3-4 小時

2. **採購訂單** (`/dashboard/purchase-orders`)
   - 複雜度：中
   - 預估工作量：2-3 小時

3. **工單管理** (`/dashboard/work-orders`)
   - 複雜度：高（複雜的狀態管理）
   - 預估工作量：3-4 小時

4. **人員管理** (`/dashboard/personnel`)
   - 複雜度：中
   - 預估工作量：2 小時

5. **庫存監控** (`/dashboard/inventory`)
   - 複雜度：中
   - 預估工作量：2 小時

## 🛠️ 技術架構詳情

### StandardDataListPage 核心介面：

```typescript
interface StandardColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, record: any) => React.ReactNode;
  className?: string;
}

interface StandardAction {
  label: string;
  onClick: (record: any) => void;
  variant?: 'default' | 'secondary' | 'destructive';
  icon?: React.ReactNode;
}

interface StandardStats {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface QuickFilter {
  key: string;
  label: string;
  options: Array<{
    label: string;
    value: string;
    count?: number;
  }>;
}
```

### 響應式設計斷點：

```css
/* Tailwind 斷點 */
sm: 640px   /* 手機橫向 */
md: 768px   /* 平板直向 - 手機版/桌面版切換點 */
lg: 1024px  /* 平板橫向/小筆電 */
xl: 1280px  /* 桌面電腦 */
```

### 溢出保護機制：

```tsx
// 容器層
<div className="flex flex-wrap gap-4 p-4 justify-center sm:justify-start w-full overflow-hidden">

// 包裝層  
<div className="flex-shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)] min-w-0 max-w-full overflow-hidden">

// 內容層
<div className="w-full h-full overflow-hidden">

// 文字層
<span className="font-medium text-gray-700 truncate">
```

## 🔧 開發環境設定

### 當前狀態：
- **開發伺服器**：http://localhost:3001 (✅ 運行中)
- **Next.js 版本**：14.2.32
- **Node.js 進程**：正常運行
- **Firebase**：已初始化

### 啟動步驟：
```bash
# 如果需要重新啟動
npm install
npx next dev --port 3001
```

## 📝 測試檢查清單

### 手機版測試 (< 768px)：
- [ ] iPhone 14 Pro 測試
- [ ] Android 裝置測試  
- [ ] 原料庫頁面無溢出
- [ ] 配方庫頁面無溢出
- [ ] 供應商頁面無溢出
- [ ] 卡片內容完整顯示
- [ ] 觸控操作正常

### 桌面版測試 (1024px+)：
- [ ] 原料庫表格正常
- [ ] 配方庫調整為舊版樣式
- [ ] 供應商調整為舊版樣式
- [ ] 統計卡片 4 欄排列
- [ ] 搜尋功能正常
- [ ] 批量操作正常

### 平板版測試 (768px-1024px)：
- [ ] 卡片模式 2-3 欄排列
- [ ] 側邊欄可摺疊
- [ ] 統計卡片 2 欄排列

## 🎯 優先級排序

### 🔴 高優先級（立即處理）：
1. 修復手機版自適應問題
2. 調整配方庫和供應商桌面版為舊版設計

### 🟡 中優先級（本週完成）：
3. 產品目錄頁面統一化
4. 採購訂單頁面統一化

### 🟢 低優先級（下週完成）：
5. 工單管理頁面統一化
6. 人員管理頁面統一化
7. 庫存監控頁面統一化

## 💡 經驗總結

### 成功經驗：
1. **Flexbox + Container Queries** 是最有效的響應式解決方案
2. **多層次溢出保護** 確保在各種情況下都不會溢出
3. **自訂渲染函數** 讓統一架構保持設計靈活性
4. **漸進式遷移** 先完成核心頁面再擴展

### 踩坑記錄：
1. **Next.js Webpack 快取問題**：定期清理 `.next` 資料夾
2. **SSR/客戶端渲染衝突**：使用 `typeof window !== 'undefined'` 檢查
3. **CSS 溢出難以調試**：建立系統性的保護機制
4. **響應式斷點混亂**：統一使用 Tailwind 預設斷點

---

## 🚀 下一次對話建議

1. **立即檢查**：手機版溢出問題的具體位置
2. **立即修復**：配方庫和供應商桌面版設計調整
3. **準備遷移**：產品目錄頁面統一化準備工作
4. **測試驗證**：在實際裝置上完整測試響應式效果

當前開發伺服器已運行在 http://localhost:3001，可直接進行測試和修改。