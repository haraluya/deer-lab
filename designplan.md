# Deer Lab UI/UX 重構計畫文檔

**目的：** 本文件旨在提供 Deer Lab 系統 UI/UX 重構的詳細分階段計畫，確保設計風格與 `design.md` 保持一致，並支援您在任何時候接續工作。

## 總體策略

本次 UI/UX 重構分為三個主要階段：

1.  **基礎樣式建立 (Foundation)：** 設定全域 CSS 變數和 Tailwind CSS 配置。
2.  **基礎 UI 元件調整 (Base Components)：)：** 根據設計規範修改核心 UI 元件。
3.  **頁面與對話框重構 (Pages & Dialogs)：** 將新的設計應用到具體頁面和彈窗。

---

## 階段 1：基礎樣式建立 (已完成 ✅)

**目標：** 將 `design.md` 中的配色系統和基礎樣式（如圓角）轉換為全域 CSS 變數，並更新 Tailwind CSS 配置以識別這些變數。

**修改檔案：**

*   `src/app/globals.css`
*   `tailwind.config.ts`

**主要變更：**

*   在 `globals.css` 中引入了基於 HSL 的 CSS 變數，定義了 `background`, `foreground`, `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card`, `border`, `input`, `ring` 等語意化顏色，以及 `radius` 變數。
*   更新了 `tailwind.config.ts`，使其 `theme.extend.colors` 和 `theme.extend.borderRadius` 引用 `globals.css` 中定義的 CSS 變數。

**參考檔案內容：** （由於內容較長，請您自行查閱專案中這兩個檔案的最新版本。它們應該已經包含了上述變更。）

---

## 階段 2：基礎 UI 元件調整 (已完成 ✅)

**目標：** 根據 `design.md` 中的組件設計規範，修改核心 UI 元件的樣式，使其使用新的語意化顏色和統一的視覺風格。

**修改檔案：**

*   `src/components/ui/card.tsx`
*   `src/components/ui/dialog.tsx`
*   `src/components/ui/button.tsx`
*   `src/components/ui/table.tsx`
*   `src/components/ui/badge.tsx`

**主要變更：**

*   **`card.tsx`：** 調整了 `Card` 元件的 `className`，使其符合 `design.md` 中 `rounded-lg`, `border-2`, `p-6`, `shadow-md` 的規範，並移除了 `CardHeader`, `CardContent`, `CardFooter` 中多餘的內邊距。
*   **`dialog.tsx`：** 修改了 `DialogContent` 的容器樣式（`max-w-2xl`, `max-h-[90vh]`, `overflow-y-auto`, `bg-background`, `border-2 border-border`, `rounded-lg`），並更新了 `DialogHeader`, `DialogFooter`, `DialogTitle` 的樣式，使其使用新的語意化顏色和排版。
*   **`button.tsx`：** 更新了 `buttonVariants` 的基礎樣式（如 `transition-all duration-200`）和所有 `variant`（`default`, `secondary`, `destructive`, `outline`, `ghost`, `link`）的顏色定義，使其使用新的語意化顏色。
*   **`table.tsx`：** 調整了 `TableHead`, `TableRow`, `TableCell` 的樣式，使其符合 `design.md` 中表格的背景、文字顏色、字重、邊框和內邊距規範。
*   **`badge.tsx`：** 修改了 `badgeVariants` 的基礎樣式（`rounded-full`, `px-2 py-1`），並重新定義了 `default`, `secondary`, `destructive` 等 `variant` 的顏色，同時新增了 `success`, `warning`, `purple` 等變體，直接使用 `design.md` 中指定的 Tailwind 顏色層級（如 `bg-blue-100 text-blue-700`）。

**參考檔案內容：** （由於內容較長，請您自行查閱專案中這些檔案的最新版本。它們應該已經包含了上述變更。）

----- 

## 階段 3：頁面與對話框重構 (已完成 ✅)

**目標：** 將新的設計系統應用到具體的頁面和彈窗中，包括佈局、主題色應用和組件使用。

**總體方法：**

*   **佈局模板：** 參考 `design.md` 中的「列表頁面模板」和「表單頁面模板」來重構頁面的 JSX 結構。
*   **主題色應用：** 根據 `design.md` 中的「功能區分」原則，為不同頁面應用對應的主題色（例如：物料管理 -> 藍色主題）。這將涉及修改硬編碼的顏色 class 為語意化顏色 class。
*   **組件使用：** 確保所有頁面和彈窗都正確使用了已調整樣式的基礎 UI 元件。

**目前進度：**

*   `src/app/dashboard/materials/page.tsx` (物料管理頁面 - 藍色主題): **已完成 ✅**
*   `src/app/dashboard/products/page.tsx` (產品管理頁面): **已完成 ✅**

---

### 階段 3.2：產品管理頁面優化 (`src/app/dashboard/products/page.tsx`) (已完成 ✅)

**目標：** 將產品管理頁面中的硬編碼顏色替換為語意化 Tailwind CSS 類別，並優化佈局和組件樣式，使其符合整體設計規範。

**總體方法：**

*   替換所有硬編碼的顏色類別（如 `text-gray-XXX`, `bg-purple-XXX`, `border-gray-XXX` 等）為語意化顏色類別（如 `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-card`, `border-border`, `border-input`, `text-destructive`, `text-success` 等）。
*   調整佈局和間距，提升視覺層次感和易讀性。
*   確保所有組件（按鈕、表格、徽章等）都正確使用了已調整樣式的基礎 UI 元件。

**子任務清單 (針對 `src/app/dashboard/products/page.tsx`)：**

*   **子任務 3.2.1：頁面標題與描述文字顏色 (已完成 ✅)**
    *   **目標：** 將頁面標題的漸變色替換為 `text-primary`，描述文字替換為 `text-muted-foreground`。
    *   **位置：** 頁面頂部的 `h1` 和 `p` 標籤。
    *   **操作：**
        *   `h1`：`bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent` 替換為 `text-primary`。
        *   `p`：`text-gray-600` 替換為 `text-muted-foreground`。

*   **子任務 3.2.2：功能按鈕區域背景與文字顏色 (已完成 ✅)**
    *   **目標：** 統一功能按鈕區域的背景和文字顏色。
    *   **位置：** 手機版和桌面版的功能按鈕區域。
    *   **操作：**
        *   新增產品按鈕的 `bg-gradient-to-r from-purple-600 to-pink-600` 替換為 `bg-primary`。
        *   `hover:from-purple-700 hover:to-pink-700` 替換為 `hover:bg-primary/90`。
        *   `text-white` 替換為 `text-primary-foreground`。

*   **子任務 3.2.3：手機版表格容器樣式 (已完成 ✅)**
    *   **目標：** 將手機版表格容器的硬編碼顏色替換為語意化類別。
    *   **位置：** 手機版表格的 `div` 容器。
    *   **操作：**
        *   `bg-white` 替換為 `bg-card`。
        *   `border-gray-100` 替換為 `border-border`。
        *   `from-gray-50 to-purple-50` 替換為 `from-background to-primary/10`。
        *   `border-gray-200` 替換為 `border-border`。
        *   `text-purple-600` 替換為 `text-primary`。
        *   `text-gray-800` 替換為 `text-foreground`。
        *   `text-gray-600` 替換為 `text-muted-foreground`。

*   **子任務 3.2.4：載入中動畫顏色 (已完成 ✅)**
    *   **目標：** 將載入動畫的顏色替換為語意化類別。
    *   **位置：** 手機版和桌面版表格中的載入動畫。
    *   **操作：**
        *   `border-purple-200` 替換為 `border-border`。
        *   `border-t-purple-600` 替換為 `border-t-primary`。
        *   `text-gray-600` 替換為 `text-muted-foreground`。

*   **子任務 3.2.5：手機版表格行樣式 (已完成 ✅)**
    *   **目標：** 將手機版表格行的硬編碼顏色替換為語意化類別。
    *   **位置：** `products.map` 內部。
    *   **操作：**
        *   `hover:bg-purple-50/50` 替換為 `hover:bg-primary/5`。
        *   `bg-gradient-to-br from-purple-500 to-pink-600` 替換為 `bg-primary`。
        *   `text-gray-900` 替換為 `text-foreground`。
        *   `text-gray-500` 替換為 `text-muted-foreground`。
        *   `text-purple-600` 替換為 `text-primary`。
        *   `text-gray-700` 替換為 `text-foreground`。
        *   `text-pink-600` 替換為 `text-accent` (或 `text-primary` 如果 accent 不適用)。
        *   `text-gray-400` 替換為 `text-muted-foreground`。

*   **子任務 3.2.6：狀態徽章顏色 (已完成 ✅)**
    *   **目標：** 將狀態徽章的硬編碼顏色替換為語意化類別。
    *   **位置：** 狀態徽章的 `span` 標籤。
    *   **操作：**
        *   `bg-green-100 text-green-800` 替換為 `bg-success/10 text-success`。
        *   `bg-red-100 text-red-800` 替換為 `bg-destructive/10 text-destructive`。

*   **子任務 3.2.7：底部「沒有產品資料」區域樣式 (已完成 ✅)**
    *   **目標：** 將底部提示區域的硬編碼顏色替換為語意化類別。
    *   **位置：** 「沒有產品資料」的 `div` 容器。
    *   **操作：**
        *   `bg-gray-100` 替換為 `bg-muted`。
        *   `text-gray-400` 替換為 `text-muted-foreground`。
        *   `text-gray-900` 替換為 `text-foreground`。
        *   `text-gray-500` 替換為 `text-muted-foreground`。
        *   新增產品按鈕的 `border-purple-200 text-purple-600 hover:bg-purple-50` 替換為 `border-input text-primary hover:bg-primary/5`。

*   **子任務 3.2.8：桌面版表格行樣式 (已完成 ✅)**
    *   **目標：** 將桌面版表格行的硬編碼顏色替換為語意化類別。
    *   **位置：** `products.map` 內部。
    *   **操作：**
        *   `hover:bg-purple-50/50` 替換為 `hover:bg-primary/5`。
        *   `bg-gradient-to-br from-purple-500 to-pink-600` 替換為 `bg-primary`。
        *   `text-gray-900` 替換為 `text-foreground`。
        *   `text-gray-500` 替換為 `text-muted-foreground`。
        *   `text-purple-600` 替換為 `text-primary`。
        *   `text-pink-600` 替換為 `text-accent` (或 `text-primary` 如果 accent 不適用)。
        *   `text-gray-700` 替換為 `text-foreground`。
        *   `text-gray-400` 替換為 `text-muted-foreground`。
        *   `text-red-600 focus:text-red-600` 替換為 `text-destructive focus:text-destructive`。

---

## 階段 4：全域優化項目 (已完成 ✅)

### 優化項目清單：

1. **手機版表格行 - 系列文字顏色 (已完成 ✅)**
   - 將 `text-gray-500` 替換為 `text-muted-foreground`

2. **手機版表格行 - 香精文字顏色 (已完成 ✅)**
   - 將 `text-gray-500` 和 `text-gray-700` 替換為 `text-muted-foreground` 和 `text-foreground`

3. **手機版表格行 - 建立時間文字顏色 (已完成 ✅)**
   - 將 `text-gray-500` 和 `text-gray-600` 替換為 `text-muted-foreground`

4. **手機版表格行 - 非活躍狀態徽章顏色 (已完成 ✅)**
   - 將 `bg-red-100 text-red-800` 替換為 `bg-destructive/10 text-destructive`

5. **底部「沒有產品資料」區域 - 圖示顏色 (已完成 ✅)**
   - 將 `text-gray-400` 替換為 `text-muted-foreground`

6. **桌面版表格容器樣式 (已完成 ✅)**
   - 將所有硬編碼的灰色和紫色替換為語意化顏色

7. **桌面版表格行 - 產品圖示背景 (已完成 ✅)**
   - 將 `bg-gradient-to-br from-purple-500 to-pink-600` 替換為 `bg-primary`

8. **桌面版表格行 - 產品名稱文字顏色 (已完成 ✅)**
   - 將 `text-gray-900` 替換為 `text-foreground`

9. **桌面版表格行 - 產品代號文字顏色 (已完成 ✅)**
   - 將 `text-gray-500` 替換為 `text-muted-foreground`

10. **桌面版表格行 - 系列圖示顏色 (已完成 ✅)**
    - 將 `text-purple-600` 替換為 `text-primary`

11. **桌面版表格行 - 狀態徽章 (已完成 ✅)**
    - 將自定義類別替換為使用 `Badge` 元件的語意化變體

12. **桌面版表格行 - 建立時間文字顏色 (已完成 ✅)**
    - 將 `text-gray-600` 替換為 `text-muted-foreground`

13. **桌面版表格行 - 刪除按鈕文字顏色 (已完成 ✅)**
    - 將 `text-red-600 focus:text-red-600` 替換為 `text-destructive focus:text-destructive`

14. **桌面版「沒有產品資料」區域樣式 (已完成 ✅)**
    - 將所有硬編碼的灰色替換為語意化顏色

15. **主儀表板頁面 - 歡迎文字顏色 (已完成 ✅)**
    - 將 `text-gray-600` 替換為 `text-muted-foreground`

16. **主儀表板頁面 - 快速操作區域樣式 (已完成 ✅)**
    - 將所有硬編碼的灰色替換為語意化顏色

17. **側邊欄佈局 - 分隔線文字顏色 (已完成 ✅)**
    - 將 `text-gray-500` 替換為 `text-muted-foreground`

18. **側邊欄佈局 - 非活動導航項目樣式 (已完成 ✅)**
    - 將硬編碼的藍色和灰色替換為語意化顏色

19. **側邊欄佈局 - 導航圖示顏色 (已完成 ✅)**
    - 將 `text-white` 和 `text-gray-500` 替換為 `text-primary-foreground` 和 `text-muted-foreground`

20. **側邊欄佈局 - 用戶導航按鈕樣式 (已完成 ✅)**
    - 將 `hover:bg-gray-100` 替換為 `hover:bg-muted`

21. **側邊欄佈局 - 用戶頭像邊框顏色 (已完成 ✅)**
    - 將 `ring-gray-200` 替換為 `ring-border`

22. **側邊欄佈局 - 用戶頭像背景顏色 (已完成 ✅)**
    - 將硬編碼的藍色漸變替換為語意化顏色

23. **側邊欄佈局 - 用戶名稱文字顏色 (已完成 ✅)**
    - 將 `text-gray-900` 和 `text-gray-500` 替換為 `text-foreground` 和 `text-muted-foreground`

24. **側邊欄佈局 - 下拉箭頭顏色 (已完成 ✅)**
    - 將 `text-gray-400` 替換為 `text-muted-foreground`

25. **側邊欄佈局 - 下拉選單用戶資訊文字顏色 (已完成 ✅)**
    - 將 `text-gray-900` 和 `text-gray-500` 替換為 `text-foreground` 和 `text-muted-foreground`

26. **側邊欄佈局 - 登出按鈕文字顏色 (已完成 ✅)**
    - 將 `text-red-600 focus:text-red-600` 替換為 `text-destructive focus:text-destructive`

27. **ErrorBoundary 組件 - 錯誤訊息文字顏色 (已完成 ✅)**
    - 將所有硬編碼的灰色替換為語意化顏色

28. **DetailViewDialog 組件 - 文字顏色 (已完成 ✅)**
    - 將 `text-gray-400` 和 `text-gray-800` 替換為語意化顏色

29. **LoadingSpinner 組件 - 載入文字顏色 (已完成 ✅)**
    - 將 `text-gray-600` 和 `text-gray-500` 替換為 `text-muted-foreground`

30. **ImportExportDialog 組件 - 文字顏色 (已完成 ✅)**
    - 將所有硬編碼的灰色替換為語意化顏色

31. **Badge 組件 - 次要變體顏色 (已完成 ✅)**
    - 將 `bg-gray-100 text-gray-700` 替換為 `bg-muted text-muted-foreground`

32. **登入頁面 - 背景色和文字顏色 (已完成 ✅)**
    - 將 `bg-gray-50` 替換為 `bg-background`
    - 將 `text-gray-500` 替換為 `text-muted-foreground`

33. **產品系列管理頁面 - 多處硬編碼顏色 (已完成 ✅)**
    - 將所有 `bg-gray-100`、`text-gray-600`、`text-gray-500` 等替換為語意化顏色
    - 優化表格容器、載入動畫、空狀態區域等

34. **香精管理頁面 - 多處硬編碼顏色 (已完成 ✅)**
    - 將所有 `bg-gray-100`、`text-gray-600`、`text-gray-500` 等替換為語意化顏色
    - 優化表格容器、載入動畫、空狀態區域等
    - 將粉色主題替換為 `accent` 主題色

35. **工單管理頁面 - 狀態選項顏色 (已完成 ✅)**
    - 將狀態選項的硬編碼顏色替換為語意化顏色
    - 優化標籤文字顏色和進度條背景

36. **物料對話框 - 表單元素顏色 (已完成 ✅)**
    - 將表單標籤、輸入框邊框、背景色等替換為語意化顏色

---

## 待優化項目 (Pending Optimizations)

以下是根據 `designplan.md` 的指導，在實際程式碼中發現的需要進一步優化的部分。這些項目主要涉及將硬編碼的顏色類別替換為語意化的 Tailwind CSS 類別，以確保設計風格的一致性。

### 其他頁面檔案

以下檔案仍包含硬編碼的顏色類別，需要進一步優化：

1. **`src/app/dashboard/purchase-orders/page.tsx`**
   - 多處使用硬編碼顏色類別

2. **`src/app/dashboard/inventory/page.tsx`**
   - 多處使用硬編碼顏色類別

3. **`src/app/dashboard/cost-management/page.tsx`**
   - 多處使用硬編碼顏色類別

4. **`src/app/dashboard/personnel/page.tsx`**
   - 多處使用硬編碼顏色類別

5. **`src/app/dashboard/work-orders/data-table.tsx`**
   - 多處使用硬編碼顏色類別

6. **`src/app/dashboard/material-categories/page.tsx`**
   - 多處使用硬編碼顏色類別

7. **`src/app/dashboard/reports/page.tsx`**
   - 多處使用硬編碼顏色類別

8. **`src/app/dashboard/suppliers/page.tsx`**
   - 多處使用硬編碼顏色類別

### 建議的優化策略

對於剩餘的優化項目，建議採用以下策略：

1. **批量替換：** 使用搜尋和替換功能，將常見的硬編碼顏色類別替換為語意化類別：
   - `text-gray-900` → `text-foreground`
   - `text-gray-600` → `text-muted-foreground`
   - `text-gray-500` → `text-muted-foreground`
   - `text-gray-400` → `text-muted-foreground`
   - `bg-gray-100` → `bg-muted`
   - `bg-gray-50` → `bg-background`
   - `border-gray-200` → `border-border`
   - `border-gray-300` → `border-input`

2. **組件級優化：** 優先優化常用的組件和對話框，確保核心功能的一致性。

3. **頁面級優化：** 按照使用頻率，優先優化主要的管理頁面。

4. **測試驗證：** 每次優化後進行視覺測試，確保顏色變更不會影響可用性。

---

## 總結

截至目前，已完成以下主要優化：

✅ **基礎樣式系統建立**
✅ **核心 UI 元件優化**
✅ **主要頁面優化** (物料管理、產品管理、主儀表板、側邊欄、產品系列、香精、工單、物料對話框)
✅ **通用組件優化** (ErrorBoundary、DetailViewDialog、LoadingSpinner、ImportExportDialog、Badge)
✅ **登入頁面優化**

**剩餘工作：** 優化其他頁面檔案中的硬編碼顏色類別，確保整個系統的視覺一致性。

**建議：** 可以繼續按照上述策略，逐個檔案進行優化，或者使用批量替換工具來加速完成剩餘的優化工作。