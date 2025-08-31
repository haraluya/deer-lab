# 庫存紀錄系統設計文檔

## 概述
本系統將為鹿鹿小作坊生產管理系統新增完整的庫存紀錄功能，追蹤所有物料和香精的庫存變動歷史，提供完整的審計軌跡。

## 功能需求分析

### 1. 側邊欄導航
- 在「數據分析」區塊下新增「庫存紀錄」分頁
- 使用 `ClipboardList` 圖標
- 路徑：`/dashboard/inventory-records`

### 2. 產品詳情頁面整合
- 在每個產品和香精詳情頁面底部新增「庫存歷史」區塊
- 顯示與該項目相關的所有庫存變動記錄
- 按時間倒序排列，顯示庫存變化趨勢

### 3. 庫存變動原因分類
- **採購購入** (`purchase`): 從供應商購入物料/香精
- **工單領料** (`workorder`): 生產工單消耗物料/香精
- **庫存盤點** (`inventory_check`): 定期庫存盤點調整
- **直接修改** (`manual_adjustment`): 管理員手動調整庫存

### 4. 庫存紀錄資料結構
```typescript
interface InventoryRecord {
  id: string;
  changeDate: Date;           // 變動日期
  changeReason: 'purchase' | 'workorder' | 'inventory_check' | 'manual_adjustment';
  itemType: 'material' | 'fragrance';  // 物料類型
  itemId: string;             // 物料/香精ID
  itemCode: string;           // 物料/香精編號
  itemName: string;           // 物料/香精名稱
  quantityChange: number;     // 增減數量（正數為增加，負數為減少）
  quantityAfter: number;      // 變動後數量
  operatorId: string;         // 操作人員ID
  operatorName: string;       // 操作人員姓名
  remarks?: string;           // 備註
  relatedDocumentId?: string; // 相關文件ID（工單號、採購單號等）
  relatedDocumentType?: string; // 相關文件類型
  createdAt: Date;            // 建立時間
}
```

### 5. 系統整合點
- **採購購入**: 在採購訂單完成時自動記錄庫存增加
- **工單完工**: 在工單完成時記錄物料消耗
- **庫存盤點**: 在庫存管理頁面新增盤點功能
- **直接修改**: 在庫存管理頁面新增手動調整功能

### 6. 庫存紀錄頁面設計
- 採用工單管理介面的設計風格
- 多功能清單，每頁最多10項
- 頂部搜尋框，支援動態篩選：
  - 物料/香精品項
  - 變動原因
  - 備註內容
  - 操作人員
- 點選紀錄使用彈窗展示詳細資訊
- 響應式設計，支援手機版和桌面版

## 技術實現方案

### 1. 資料庫設計
- 新增 `inventory_records` 集合
- 建立複合索引：`itemId + changeDate`
- 建立查詢索引：`changeReason`, `operatorId`, `itemType`

### 2. 前端組件
- `InventoryRecordsPage`: 庫存紀錄主頁面
- `InventoryRecordDialog`: 庫存紀錄詳情對話框
- `InventoryHistorySection`: 產品詳情頁面的庫存歷史區塊
- `InventoryRecordForm`: 手動調整庫存表單

### 3. 後端API
- `createInventoryRecord`: 建立庫存紀錄
- `getInventoryRecords`: 查詢庫存紀錄
- `getItemInventoryHistory`: 查詢特定物料的庫存歷史

### 4. 權限控制
- 查看庫存紀錄：所有已認證用戶
- 建立庫存紀錄：系統自動或管理員權限
- 手動調整庫存：管理員權限

## 實現順序

### 第一階段：基礎架構 ✅
1. ✅ 建立資料庫集合和索引
2. ✅ 建立後端API函數
3. ✅ 建立前端組件基礎結構

### 第二階段：核心功能 ✅
1. ✅ 實現庫存紀錄頁面
2. ✅ 實現庫存歷史顯示組件
3. ✅ 整合到產品和香精詳情頁面

### 第三階段：系統整合 🔄
1. 🔄 整合採購購入功能
2. 🔄 整合工單領料功能
3. ✅ 整合庫存盤點功能（手動調整）
4. ✅ 整合手動調整功能

### 第四階段：優化測試
1. 性能優化
2. 用戶體驗改進
3. 錯誤處理完善
4. 測試和除錯

## 已完成功能

### 1. 側邊欄導航 ✅
- 在「數據分析」區塊下新增「庫存紀錄」分頁
- 使用 `ClipboardList` 圖標
- 路徑：`/dashboard/inventory-records`

### 2. 庫存紀錄頁面 ✅
- 採用工單管理介面的設計風格
- 多功能清單，每頁最多10項
- 頂部搜尋框，支援動態篩選
- 統計卡片顯示各類型紀錄數量
- 響應式設計，支援手機版和桌面版

### 3. 庫存歷史區塊 ✅
- 在香精詳情頁面底部新增「庫存歷史」區塊
- 顯示與該項目相關的所有庫存變動記錄
- 按時間倒序排列，顯示庫存變化趨勢
- 包含當前庫存、總增加、總消耗統計

### 4. 手動調整庫存功能 ✅
- 支援增加和減少庫存
- 即時預覽調整後的庫存數量
- 防止庫存變為負數
- 完整的表單驗證和錯誤處理

### 5. 庫存紀錄詳情對話框 ✅
- 美觀的卡片式設計
- 顯示完整的庫存變動資訊
- 支援各種變動原因的視覺化標示
- 響應式設計，支援各種螢幕尺寸

## 技術實現

### 1. 後端API ✅
- `createInventoryRecord`: 建立庫存紀錄
- `getInventoryRecords`: 查詢庫存紀錄
- `getItemInventoryHistory`: 查詢特定物料的庫存歷史
- `createInventoryRecordByReason`: 根據變動原因建立庫存紀錄

### 2. 前端組件 ✅
- `InventoryRecordsPage`: 庫存紀錄主頁面
- `InventoryRecordDialog`: 庫存紀錄詳情對話框
- `InventoryHistorySection`: 產品詳情頁面的庫存歷史區塊
- `InventoryAdjustmentForm`: 手動調整庫存表單

### 3. 資料結構 ✅
- 完整的 `InventoryRecord` 介面定義
- 支援四種變動原因：採購購入、工單領料、庫存盤點、直接修改
- 支援物料和香精兩種類型
- 完整的審計資訊記錄

## 設計原則

### 1. 美觀性
- 採用系統一致的設計語言
- 使用漸變色彩和現代化UI元素
- 響應式設計，支援各種螢幕尺寸

### 2. 實用性
- 清晰的資訊層次結構
- 直觀的操作流程
- 完整的搜尋和篩選功能
- 詳細的歷史記錄追蹤

### 3. 性能
- 分頁載入，避免一次性載入大量資料
- 索引優化，提升查詢效率
- 快取機制，減少重複查詢

### 4. 可維護性
- 模組化設計，便於後續擴展
- 統一的錯誤處理機制
- 完整的日誌記錄
- 清晰的程式碼結構

## 注意事項

1. 確保庫存紀錄的準確性和完整性
2. 處理並發操作可能導致的資料不一致問題
3. 提供資料匯出功能，便於審計和報表
4. 考慮資料備份和恢復策略
5. 遵循資料保護和隱私法規要求
