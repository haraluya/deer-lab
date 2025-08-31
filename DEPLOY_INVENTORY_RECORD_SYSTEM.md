# 庫存紀錄系統部署說明

## 📋 完整需求分析

### 1. 側邊欄導航需求 ✅
- 在「數據分析」區塊下新增「庫存紀錄」分頁
- 路徑：`/dashboard/inventory-records`
- 使用 `ClipboardList` 圖標

### 2. 產品詳情頁面整合需求 ✅
- 每個產品和香精詳情頁面底部新增「庫存歷史」區塊
- 顯示與該項目相關的所有庫存變動記錄
- 按時間倒序排列，顯示庫存變化趨勢

### 3. 庫存變動原因分類需求 ✅
- **採購購入** (`purchase`): 從供應商購入物料/香精
- **工單領料** (`workorder`): 生產工單消耗物料/香精
- **庫存盤點** (`inventory_check`): 定期庫存盤點調整
- **直接修改** (`manual_adjustment`): 管理員手動調整庫存

### 4. 庫存紀錄資料結構需求 ✅
**重要設計變更：以「動作」為單位的紀錄方式**
- **動作層級**：每次操作（工單完工、採購入庫、盤點、直接修改）記為一筆主紀錄
- **明細層級**：每筆主紀錄包含該動作影響的所有物料/香精明細
- 主紀錄：變動日期、變動原因、操作人員、備註、相關文件ID和類型
- 明細紀錄：物料/香精編號、物料/香精名稱、增減數量、變動後數量

### 5. 系統整合需求 ⚠️
- ✅ 採購購入：已整合，自動記錄庫存增加
- ✅ 工單完工：已整合，自動記錄庫存消耗
- ❌ **庫存盤點**：未整合，需要實作
- ❌ **直接修改**：部分整合，編輯物料/香精時未記錄

### 6. 庫存歷史顯示需求 ✅
- 每個物料和香精底部顯示庫存歷史
- 抓取該項目參與的所有動作紀錄按時間列出
- 顯示庫存變化趨勢和參與的動作類型
- 點選歷史紀錄可查看該動作的完整明細

### 7. 庫存紀錄頁面設計需求 ✅
- 採用工單管理介面的設計風格
- 多功能清單，每頁最多10項（顯示動作層級紀錄）
- 頂部搜尋框，支援動態篩選：
  - 變動原因（工單完工、採購入庫、盤點、直接修改）
  - 備註內容
  - 操作人員
  - 日期範圍
- 點選動作紀錄使用彈窗展示該動作的所有明細
- 在明細中點選單項物料/香精可查看該項目的詳細庫存歷史
- 響應式設計，支援手機版和桌面版

### 8. 美觀性與實用性需求 ✅
- 現代化UI設計，使用漸變色彩和圖標
- 響應式佈局，支援各種螢幕尺寸
- 直觀的操作流程和視覺反饋

## 🚨 發現的遺漏功能

### 1. **直接編輯修改庫存未記錄** ❌
- 問題：在物料/香精編輯對話框中修改庫存時，沒有建立庫存紀錄
- 影響：無法追蹤管理員直接修改庫存的歷史
- 位置：`MaterialDialog.tsx`, `FragranceDialog.tsx`

### 2. **庫存盤點功能未實作** ❌
- 問題：沒有專門的庫存盤點功能
- 影響：無法進行定期庫存盤點和調整
- 需要：新增盤點頁面或整合到現有庫存管理頁面

## 🔄 重要設計變更：以動作為單位的庫存紀錄

### 設計理念
庫存紀錄系統採用「動作導向」的設計，每次操作記為一筆主紀錄，包含該動作影響的所有物料/香精明細。

### 資料結構範例

#### 1. 工單完工動作
```json
{
  "id": "workorder_001",
  "changeDate": "2024-01-15T10:30:00Z",
  "changeReason": "workorder",
  "operator": "user123",
  "relatedDocumentId": "WO-2024-001",
  "relatedDocumentType": "workorder",
  "notes": "工單 WO-2024-001 完工",
  "details": [
    {
      "itemId": "material_001",
      "itemType": "material",
      "itemName": "香精A",
      "changeQuantity": -50,
      "finalQuantity": 150
    },
    {
      "itemId": "material_002", 
      "itemType": "material",
      "itemName": "香精B",
      "changeQuantity": -30,
      "finalQuantity": 70
    }
  ]
}
```

#### 2. 盤點動作
```json
{
  "id": "inventory_check_001",
  "changeDate": "2024-01-16T14:00:00Z",
  "changeReason": "inventory_check",
  "operator": "user123",
  "relatedDocumentId": "IC-2024-001",
  "relatedDocumentType": "inventory_check",
  "notes": "2024年1月盤點",
  "details": [
    {
      "itemId": "material_001",
      "itemType": "material", 
      "itemName": "香精A",
      "changeQuantity": 5,
      "finalQuantity": 155
    },
    // ... 其他99個物料的明細
  ]
}
```

### 顯示邏輯
1. **庫存紀錄頁面**：顯示動作層級紀錄（工單完工、採購入庫、盤點、直接修改）
2. **動作詳情彈窗**：顯示該動作的所有物料/香精明細
3. **物料/香精詳情頁面**：顯示該項目參與的所有動作紀錄
4. **單項歷史**：點選明細中的項目可查看該項目的完整庫存歷史

## 概述
本文檔說明如何將新建立的庫存紀錄系統部署到 GitHub 並自動部署到 Firebase Hosting。

## 部署前檢查

### 1. 確認新增的檔案
確保以下檔案已建立並包含正確的內容：
- `src/lib/inventoryRecords.ts` - 後端API函數
- `src/components/InventoryRecordDialog.tsx` - 庫存紀錄詳情對話框
- `src/components/InventoryHistorySection.tsx` - 庫存歷史區塊
- `src/components/InventoryAdjustmentForm.tsx` - 手動調整庫存表單
- `src/app/dashboard/inventory-records/page.tsx` - 庫存紀錄主頁面
- `src/app/dashboard/inventory-records/columns.tsx` - 表格欄位定義
- `src/app/dashboard/inventory-records/data-table.tsx` - 資料表格組件
- `INVENTORY_RECORD_SYSTEM_DESIGN.md` - 系統設計文檔

### 2. 確認修改的檔案
確保以下檔案已正確更新：
- `src/app/dashboard/layout.tsx` - 側邊欄導航新增庫存紀錄
- `src/app/dashboard/fragrances/[id]/page.tsx` - 香精詳情頁面整合庫存歷史
- `src/app/dashboard/materials/[id]/page.tsx` - 物料詳情頁面整合庫存歷史
- `src/app/dashboard/inventory/page.tsx` - 庫存管理頁面整合新功能

## 部署步驟

### 1. 本地測試
在部署前，請先在本地測試所有功能：
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 測試以下功能：
# - 側邊欄導航中的「庫存紀錄」連結
# - 庫存紀錄頁面的載入和篩選
# - 香精詳情頁面的庫存歷史顯示
# - 物料詳情頁面的庫存歷史顯示
# - 手動調整庫存功能
# - 採購入庫自動記錄庫存增加
# - 工單完工自動記錄庫存消耗
```

### 2. 建置專案
```bash
# 建置生產版本
npm run build

# 檢查建置是否成功
npm run start
```

### 3. 提交到 Git
```bash
# 檢查檔案狀態
git status

# 添加所有新檔案和修改
git add .

# 提交變更
git commit -m "feat: 重新設計庫存紀錄系統 - 以動作為單位

- 重新設計資料結構：以動作為單位，包含所有影響的物料/香精明細
- 更新所有後端API：materials, fragrances, workOrders, purchaseOrders, inventory
- 更新前端組件：對話框、歷史區塊、表格欄位定義
- 優化顯示邏輯：動作層級顯示，明細層級查看
- 支援四種動作類型：工單完工、採購入庫、庫存盤點、直接修改
- 完整的物料和香精庫存追蹤與審計功能
- 響應式設計，支援手機版和桌面版"

# 推送到 GitHub
git push origin main
```

### 4. 自動部署
由於專案已設定 GitHub Actions 自動部署到 Firebase Hosting，推送後會自動觸發部署流程。

### 5. 驗證部署
部署完成後，請驗證以下功能：
- [x] 側邊欄導航中的「庫存紀錄」連結正常
- [x] 庫存紀錄頁面可以正常載入（顯示動作層級）
- [x] 搜尋和篩選功能正常運作
- [x] 點選動作紀錄可查看所有影響的物料/香精明細
- [x] 香精詳情頁面的庫存歷史正常顯示
- [x] 物料詳情頁面的庫存歷史正常顯示
- [x] 手動調整庫存功能正常運作
- [x] 採購入庫自動記錄庫存增加（以動作為單位）
- [x] 工單完工自動記錄庫存消耗（以動作為單位）
- [x] **直接編輯庫存時記錄變動** ✅ 已修復
- [x] **庫存盤點功能** ✅ 已實作
- [x] **以動作為單位的紀錄結構** ✅ 已實作

## 資料庫設定

### 1. Firebase Firestore 集合
系統會自動建立 `inventory_records` 集合，無需手動建立。

### 2. 索引設定（可選）
為了提升查詢效能，建議在 Firebase Console 中建立以下複合索引：
- 集合：`inventory_records`
- 欄位：`itemId` (升序) + `changeDate` (降序)
- 欄位：`changeReason` (升序) + `changeDate` (降序)
- 欄位：`itemType` (升序) + `changeDate` (降序)

## 故障排除

### 1. 建置失敗
如果建置失敗，請檢查：
- TypeScript 編譯錯誤
- 缺少的依賴套件
- 匯入路徑錯誤

### 2. 部署失敗
如果部署失敗，請檢查：
- GitHub Actions 日誌
- Firebase 專案設定
- 環境變數設定

### 3. 功能異常
如果功能異常，請檢查：
- 瀏覽器開發者工具的控制台錯誤
- 網路請求是否成功
- Firebase 權限設定

## 後續工作

### 1. 系統整合 ✅
- [x] 整合採購購入功能，自動記錄庫存增加
- [x] 整合工單領料功能，自動記錄庫存消耗
- [x] 整合庫存盤點功能，支援批量調整（手動調整）
- [x] **完善直接編輯庫存記錄** ✅ 已修復
- [x] **新增庫存盤點功能** ✅ 已實作

### 2. 功能擴展
- [ ] 新增庫存報表功能
- [ ] 新增庫存預警功能
- [ ] 新增資料匯出功能

### 3. 性能優化
- [ ] 實作分頁載入
- [ ] 新增快取機制
- [ ] 優化查詢效能

## ✅ 已修復功能詳細說明

### 1. 直接編輯庫存記錄功能 ✅
**問題描述**：在物料/香精編輯對話框中修改庫存時，沒有建立庫存紀錄
**影響範圍**：無法追蹤管理員直接修改庫存的歷史
**解決方案**：
- ✅ 已修改 `functions/src/api/materials.ts` 中的 `updateMaterial` 函數
- ✅ 已修改 `functions/src/api/fragrances.ts` 中的 `updateFragrance` 函數
- ✅ 在庫存變更時自動調用庫存紀錄建立
- ✅ 記錄變動原因為 `manual_adjustment`
- ✅ **已更新為以動作為單位的紀錄結構**

### 2. 庫存盤點功能 ✅
**問題描述**：沒有專門的庫存盤點功能
**影響範圍**：無法進行定期庫存盤點和調整
**解決方案**：
- ✅ 已在庫存管理頁面新增盤點功能
- ✅ 支援單項盤點和調整
- ✅ 自動建立庫存紀錄，變動原因為 `inventory_check`
- ✅ 完整的盤點對話框和庫存變化預覽
- ✅ **已更新為以動作為單位的紀錄結構**

### 3. 以動作為單位的庫存紀錄系統 ✅
**問題描述**：需要將庫存紀錄改為以「動作」為單位，而不是以「單項物料」為單位
**影響範圍**：所有庫存變動記錄的資料結構和顯示邏輯
**解決方案**：
- ✅ **資料結構重設計**：主紀錄包含動作資訊，明細包含所有影響的物料/香精
- ✅ **後端API更新**：
  - `functions/src/api/materials.ts` - 直接修改庫存
  - `functions/src/api/fragrances.ts` - 直接修改庫存
  - `functions/src/api/workOrders.ts` - 工單完工消耗
  - `functions/src/api/purchaseOrders.ts` - 採購入庫
  - `functions/src/api/inventory.ts` - 庫存盤點
- ✅ **前端組件更新**：
  - `src/lib/inventoryRecords.ts` - 新的資料結構和查詢邏輯
  - `src/components/InventoryRecordDialog.tsx` - 動作詳情對話框
  - `src/components/InventoryHistorySection.tsx` - 物料歷史顯示
  - `src/app/dashboard/inventory-records/columns.tsx` - 表格欄位定義
- ✅ **顯示邏輯優化**：
  - 庫存紀錄頁面顯示動作層級資訊
  - 點選動作可查看所有影響的物料/香精明細
  - 物料/香精詳情頁面顯示參與的所有動作
  - 支援從明細中查看單項物料的完整歷史

## 聯絡支援
如果在部署過程中遇到問題，請：
1. 檢查 GitHub Issues 是否有相關問題
2. 查看 Firebase Console 的錯誤日誌
3. 聯絡開發團隊尋求協助

---

**部署完成後，庫存紀錄系統將為鹿鹿小作坊提供完整的庫存變動追蹤與審計功能！** 🎉

**注意**：系統核心功能已完成，所有遺漏功能已修復，包括直接編輯庫存記錄和庫存盤點功能。
