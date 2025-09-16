# 德科斯特的實驗室 - API 系統完整文檔

## 📋 目錄
1. [系統架構概述](#系統架構概述)
2. [API 分類總覽](#api-分類總覽)
3. [詳細API文檔](#詳細api文檔)
4. [清理記錄](#清理記錄)
5. [整合建議](#整合建議)

---

## 🏗️ 系統架構概述

### 技術架構
- **部署平台**：Firebase Functions (Node.js)
- **資料庫**：Cloud Firestore
- **認證系統**：Firebase Auth
- **API架構**：REST API + Firebase Functions

### 統一標準化架構
大部分API已經採用統一的標準化架構：
- **統一回應格式**：`{ success, data, meta }`
- **統一錯誤處理**：使用 `ErrorHandler` 類別
- **統一權限驗證**：基於角色的權限系統
- **結構化日誌**：完整的操作追蹤

---

## 📊 API 分類總覽

### 🚀 實際使用中的API（33個）

| 分類 | 使用中API | 主要功能 |
|------|-----------|----------|
| 基礎資料管理 | 10個 | 物料、香精、產品、供應商CRUD |
| 生產作業管理 | 2個 | 工單建立、完成 |
| 庫存管理 | 4個 | 調整、統計、查詢 |
| 採購管理 | 3個 | 採購單、收貨、狀態管理 |
| 人員權限管理 | 6個 | 用戶、角色、權限設定 |
| 工時記錄 | 2個 | 時間追蹤、工時統計 |
| 購物車系統 | 6個 | 全域購物車功能 |

**實際使用：33個 API 端點**

### 📦 可供擴展的API（33個）

| 分類 | 未使用API | 用途說明 |
|------|-----------|----------|
| 系統診斷 | 5個 | 香精狀態診斷、比例修復 |
| 進階管理 | 10個 | 批次匯入、狀態管理、工單更新 |
| 庫存進階 | 2個 | 盤點、統一更新 |
| 其他功能 | 16個 | 各類CRUD的進階操作 |

**總計：66個 API 端點（33個使用中 + 33個可擴展）**

---

## 📖 詳細API文檔

### 1. 基礎資料管理 (20個API)

#### 1.1 物料管理 (materials.ts)
- **`createMaterial`** - 建立新物料
  - 功能：自動生成代號、分類管理、供應商關聯
  - 特色：智能代號生成系統 (主分類ID + 細分分類ID + 隨機碼)

- **`updateMaterial`** - 更新物料資料
  - 功能：支援庫存變更、分類調整、代號更新
  - 特色：自動建立庫存異動記錄

- **`deleteMaterial`** - 刪除物料
  - 功能：安全刪除、關聯檢查
  - 保護：防止刪除仍有工單或採購單使用的物料

- **`importMaterials`** - 批量匯入物料
  - 功能：大量資料匯入、錯誤處理
  - 特色：支援供應商自動創建、代號衝突處理

#### 1.2 香精管理 (fragrances.ts)
- **`createFragrance`** - 建立新香精
  - 功能：PG/VG比例計算、狀態管理

- **`updateFragrance`** - 更新香精資料
  - 功能：智能更新模式、庫存異動記錄

- **`updateFragranceByCode`** - 根據代號更新香精
  - 功能：按代號查找更新、部分欄位更新

- **`deleteFragrance`** - 刪除香精
  - 功能：關聯性檢查、安全刪除

- **`diagnoseFragranceStatus`** 🔧 - 診斷香精狀態
  - 功能：檢查狀態異常、統計報告

- **`fixFragranceStatus`** 🔧 - 修復香精狀態
  - 功能：批量修復無效狀態

- **`fixAllFragranceRatios`** 🔧 - 修正香精比例
  - 功能：重新計算PG/VG比例

- **`diagnoseFragranceRatios`** 🔧 - 診斷香精比例
  - 功能：檢查比例計算錯誤

#### 1.3 產品管理 (products.ts)
- **`createProduct`** - 建立新產品
  - 功能：自動編號生成、香精關聯
  - 特色：觸發香精狀態實時更新

- **`updateProduct`** - 更新產品資料
  - 功能：香精更換歷史記錄、狀態自動管理

- **`deleteProduct`** - 刪除產品
  - 功能：香精狀態自動調整

- **`changeProductFragrance`** - 更換產品香精
  - 功能：詳細歷史記錄、狀態實時更新

- **`updateFragranceStatusesRealtime`** - 實時更新香精狀態
  - 功能：根據產品使用情況自動調整香精狀態

- **`batchUpdateFragranceStatuses`** - 批次更新香精狀態
  - 功能：系統維護用、全面狀態檢查

- **`getFragranceChangeHistory`** - 查詢香精更換歷史
  - 功能：分頁搜尋、多條件篩選

- **`getProductFragranceHistory`** - 取得產品香精歷史
  - 功能：特定產品的完整香精變更記錄

#### 1.4 供應商管理 (suppliers.ts)
- **`createSupplier`** - 建立新供應商
  - 功能：基本資料管理、聯絡方式記錄

- **`updateSupplier`** - 更新供應商資料
  - 功能：資料修改、名稱重複檢查

- **`deleteSupplier`** - 刪除供應商
  - 功能：關聯性檢查、安全刪除

### 2. 生產作業管理 (15個API)

#### 2.1 工單管理 (workOrders.ts)
- **`createWorkOrder`** - 建立新工單
  - 功能：BOM計算、物料需求規劃、自動編號
  - 特色：支援複雜的物料組成計算

- **`updateWorkOrder`** - 更新工單
  - 功能：狀態管理、數量調整、品管狀態

- **`deleteWorkOrder`** - 刪除工單
  - 功能：關聯工時記錄清理、狀態檢查

- **`completeWorkOrder`** - 完成工單
  - 功能：庫存扣除、異動記錄、狀態變更
  - 特色：統一的庫存更新機制

#### 2.2 工時管理
- **`addTimeRecord`** - 新增工時記錄
  - 功能：時間計算、人員驗證、統一格式

### 3. 庫存管理 (6個API)

#### 3.1 庫存操作 (inventory.ts)
- **`adjustInventory`** - 手動調整庫存
  - 功能：單項庫存調整、異動記錄

- **`quickUpdateInventory`** - 快速批量更新庫存
  - 功能：批量操作、盤點支援

- **`performStocktake`** - 執行庫存盤點
  - 功能：大量庫存調整、盤點記錄

- **`unifiedInventoryUpdate`** 🎯 - 統一庫存更新API
  - 功能：整合所有庫存修改操作的統一入口

- **`getInventoryOverview`** - 獲取庫存總覽
  - 功能：統計資料、成本計算、低庫存提醒

- **`getLowStockItems`** - 獲取低庫存項目
  - 功能：庫存預警、補貨提醒

### 4. 採購管理 (3個API)

#### 4.1 採購單管理 (purchaseOrders.ts)
- **`createPurchaseOrders`** - 建立採購單
  - 功能：多供應商批量下單、自動編號

- **`updatePurchaseOrderStatus`** - 更新採購單狀態
  - 功能：狀態流程管理

- **`receivePurchaseOrderItems`** - 採購單收貨
  - 功能：庫存入庫、收貨記錄、庫存異動
  - 特色：支援代號查找和精確庫存控制

### 5. 人員權限管理 (8個API)

#### 5.1 人員管理 (personnel.ts)
- **`createPersonnel`** - 建立人員
  - 功能：Firebase Auth集成、角色分配

- **`updatePersonnel`** - 更新人員資料
  - 功能：資料修改、密碼更新、角色調整

- **`deletePersonnel`** - 刪除人員
  - 功能：帳號清理、安全檢查

#### 5.2 角色管理 (roles.ts)
- **`getRoles`** - 獲取角色列表
  - 功能：角色查詢

- **`initializeDefaultRoles`** - 初始化預設角色
  - 功能：系統初始化、預設角色創建

#### 5.3 用戶管理 (users.ts)
- **`setUserStatus`** - 設定用戶狀態
  - 功能：啟用/停用帳號

### 6. 工時記錄 (4個API)

#### 6.1 工時查詢 (timeRecords.ts) ✅ 已統一
- **`getPersonalTimeRecordsV2`** 🚀 - 個人工時記錄查詢
  - 功能：統一ID系統、改進的查詢機制
  - 特色：詳細除錯資訊、標準化回應格式
  - 狀態：✅ 前端正在使用

- **`cleanupInvalidTimeRecords`** - 清理無效工時記錄
  - 功能：資料清理、系統維護
  - 狀態：✅ 前端正在使用

### 7. 購物車系統 (6個API)

#### 7.1 全域購物車 (globalCart.ts)
- **`addToGlobalCart`** - 加入購物車
  - 功能：商品驗證、數量管理

- **`updateGlobalCartItem`** - 更新購物車項目
  - 功能：數量調整

- **`removeFromGlobalCart`** - 移除購物車項目
  - 功能：項目刪除

- **`clearGlobalCart`** - 清空購物車
  - 功能：批量清除

- **`batchAddToGlobalCart`** - 批量加入購物車
  - 功能：大量項目處理

- **`syncGlobalCart`** - 同步購物車
  - 功能：從localStorage遷移、資料同步

---

## 🧹 清理記錄

### 📅 清理時間：2025-09-16

### ✅ 已完成的清理工作

#### 1. 工時記錄系統統一 ✅
- **動作**：移除重複的工時記錄API
- **清理前**：
  - `timeRecords.ts` - 舊版本（`getPersonalValidTimeRecords`）
  - `timeRecords-v2.ts` - 新版本（`getPersonalTimeRecordsV2`）
- **清理後**：
  - 保留：`timeRecords.ts`（原 V2 版本重命名）
  - 移除：舊版本完全刪除
  - 前端無需修改（已在使用 V2 版本）

#### 2. API 使用狀況分析 ✅
- **前端實際使用**：33個 API
- **後端可用但未使用**：33個 API
- **重複功能**：已識別並清理工時記錄重複

#### 3. 維護工具API整理 ✅ (2025-09-16)
- **動作**：將未使用的維護類API移動到專用資料夾
- **建立結構**：
  - `functions/src/api/maintenance/fragranceTools.ts` - 香精診斷修復工具
  - `functions/src/api/maintenance/inventoryTools.ts` - 庫存盤點工具
  - `functions/src/api/maintenance/systemTools.ts` - 系統管理工具
  - `functions/src/api/maintenance/README.md` - 使用指引

- **移動的API**：15個維護工具API
  - **香精工具** (5個)：`updateFragranceByCode`, `diagnoseFragranceStatus`, `fixFragranceStatus`, `diagnoseFragranceRatios`, `fixAllFragranceRatios`
  - **庫存工具** (2個)：`performStocktake`, `unifiedInventoryUpdate`
  - **系統工具** (8個)：`importMaterials`, `updateWorkOrder`, `addTimeRecord`, `deleteWorkOrder`, `deleteSupplier`, `getRoles`, `assignUserRole`, `batchUpdateFragranceStatuses`

- **條件性導出**：透過環境變數 `ENABLE_MAINTENANCE_TOOLS` 控制
- **清理效果**：
  - 核心API檔案更簡潔
  - 維護工具集中管理
  - 生產環境可選擇性啟用
  - 更新CLAUDE.md維護指引

### 📊 清理效果
- **重複問題解決**：✅ 工時記錄系統統一
- **檔案結構優化**：✅ 維護工具分離
- **條件性功能**：✅ 可控制的維護工具啟用
- **前端相容性**：✅ 完全相容（無需修改）
- **部署優化**：✅ 核心功能與維護工具分離

---

## 🔄 重複功能識別

### ⚠️ 主要重複功能

#### 1. 工時記錄系統重複 ✅ 已解決
- **重複檔案**：~~`timeRecords.ts` vs `timeRecords-v2.ts`~~
- **重複功能**：~~`getPersonalValidTimeRecords` vs `getPersonalTimeRecordsV2`~~
- **解決方案**：✅ 已統一使用最新版本，移除舊版本

#### 2. 庫存更新功能分散
- **分散位置**：
  - `inventory.ts` - 專門的庫存管理
  - `purchaseOrders.ts` - 收貨入庫
  - `workOrders.ts` - 生產扣料
- **重複邏輯**：庫存計算、異動記錄創建
- **現有統一方案**：`unifiedInventoryUpdate` API

#### 3. 用戶管理功能部分重複
- **重複檔案**：`personnel.ts` vs `users.ts`
- **重複功能**：用戶狀態管理
- **建議**：明確分工或合併

#### 4. 香精狀態管理重複
- **重複功能**：多個地方都有香精狀態更新邏輯
- **分散位置**：`products.ts`、`fragrances.ts`
- **建議**：統一為一個狀態管理服務

### ✅ 已解決的重複問題
1. **統一庫存更新**：`unifiedInventoryUpdate` API 已經整合了庫存修改操作
2. **標準化架構**：大多數API已經使用統一的架構模式

---

## 💡 整合建議

### 🎯 短期改進（高優先級）

#### 1. 工時記錄系統統一 ✅ 已完成
```markdown
✅ 已移除：舊版 timeRecords.ts
✅ 已保留：timeRecords-v2.ts (已重命名為 timeRecords.ts)
```

#### 2. 完善統一庫存API
```markdown
推廣使用：unifiedInventoryUpdate
標準化：所有庫存異動都通過統一API
```

### 🚀 中期優化（中優先級）

#### 3. 香精狀態管理服務化
```markdown
建立：FragranceStatusService
整合：所有香精狀態更新邏輯
自動化：狀態變更觸發機制
```

#### 4. 用戶管理架構清理
```markdown
明確分工：personnel.ts (人員資料) vs users.ts (系統帳號)
或合併：統一用戶管理模組
```

### 🔮 長期規劃（低優先級）

#### 5. API Gateway 模式
```markdown
建立：統一的API入口
實現：請求路由、認證、限流
監控：API使用統計、效能監控
```

#### 6. 微服務架構演進
```markdown
拆分：按業務領域劃分服務
解耦：減少服務間直接依賴
```

---

## 📈 系統優勢

### ✅ 已實現的優秀架構
1. **統一標準化**：一致的API設計模式
2. **完整追蹤**：詳細的操作日誌和異動記錄
3. **權限控制**：基於角色的細粒度權限
4. **資料完整性**：事務處理和關聯性檢查
5. **系統維護**：豐富的診斷和修復工具

### 🎯 系統特色
- **智能代號生成**：自動化的編碼系統
- **狀態自動管理**：香精狀態根據使用情況自動調整
- **庫存精確控制**：統一的庫存異動追蹤
- **歷史完整記錄**：所有重要操作都有詳細記錄
- **錯誤處理完善**：統一的錯誤處理和用戶友好提示

---

## 📝 文檔版本資訊

- **創建日期**：2025-09-16
- **API 總數**：66個（33個使用中 + 33個可擴展）
- **檔案來源**：Firebase Functions (`functions/src/api/`)
- **分析範圍**：完整的生產管理系統API
- **清理日期**：2025-09-16
- **清理成果**：移除1個重複API檔案，統一工時記錄系統
- **最後更新**：2025-09-16

---

## 🎯 清理總結

### ✅ 完成的清理工作
1. **工時記錄系統統一**：移除重複的API，保持前端相容性
2. **API使用分析**：明確區分實際使用與可擴展的API
3. **文檔更新**：反映清理結果和系統現狀

### 💡 系統現狀
- **核心功能穩定**：33個API支撐主要業務流程
- **擴展能力充足**：33個進階API支援未來功能開發
- **架構清晰**：統一的API設計模式和錯誤處理
- **維護便利**：清楚的使用狀況標示

*本文檔由系統自動分析生成並手動清理優化，涵蓋德科斯特的實驗室完整API架構*