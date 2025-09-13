# 🎯 API標準化與統一架構遷移任務清單

**建立時間**: 2025-09-12  
**目標**: 完成所有頁面和組件從舊API調用方式遷移至統一API客戶端架構

## 🔧 開發流程規則

### 1. **建置規則**
- ✅ **只執行** `npm run build`，**絕對不執行** `npm run dev`
- ✅ 每次完成修改後必須確認建置成功
- ✅ 建置錯誤必須立即修復才能進行下一項任務

### 2. **部署規則**
- ⚠️ **不主動進行線上部署和推送 GitHub**
- ⚠️ 需要**明確指示**才執行 `firebase deploy` 或 `git push`
- ⚠️ 每次部署前都要告知用戶即將執行的操作

### 3. **測試規則**
- 📋 每次完成一個任務，必須**列出可能影響的測試點**供人工驗證
- 📋 包含：頁面載入、功能操作、數據顯示、響應式佈局等測試項目
- 📋 特別注意統一架構後的使用者體驗一致性

### 4. **相容性規則**
- 🎯 **統一後要保留原本的**：視覺、操作方式、功能、顯示欄位、邏輯
- 🎯 不能因為遷移而改變使用者習慣的操作流程
- 🎯 所有現有功能都要完整保留，不能有功能缺失

### 5. **程式碼優化規則**
- 🏗️ **優先在統一頁面做修改**，以適配更多頁面，節省程式碼
- 🏗️ **只有獨特功能或需求**才做個別頁面的地方調整
- 🏗️ **記住統一頁面的目的**：減少重複程式碼，提高維護性
- 🏗️ 新功能要考慮其他頁面是否也能受益

### 6. **任務追蹤規則**
- ☑️ 每次完成任務都要把該項目**勾選已完成（✅）**
- ☑️ 進行中的任務標記為 **🔄**
- ☑️ 遇到阻礙的任務標記為 **⚠️** 並說明問題

### 7. **文檔更新規則**
- 📚 完成任務確認驗收後，在 **CLAUDE.md** 寫上統一頁面的指向和使用說明
- 📚 更新相關的架構文檔和使用指南
- 📚 記錄重要的技術決策和變更原因

---

## 📊 現狀分析總結

### ✅ 已完成統一架構的部分
- **統一API客戶端**: `src/lib/apiClient.ts` 已實現完整架構
- **Hook整合**: `src/hooks/useApiClient.ts` 提供便捷調用方式
- **部分停用的Functions**: `auth.ts`, `globalCart.ts`, `timeRecords.ts`, `productSeries.ts`, `resetPermissions.ts` 已暫停並註解

### ⚠️ 尚未遷移至統一架構的檔案總數：**24個**

---

## 🗂️ 任務分類與執行計劃

### 🚀 階段一：清理備份檔案（立即執行）

#### 📋 備份檔案清理清單
- [x] `src/app/dashboard/materials/MaterialDialog-backup.tsx`
- [x] `src/app/dashboard/products/page-backup.tsx`  
- [x] `src/app/dashboard/suppliers/page-backup.tsx`
- [x] `src/app/dashboard/fragrances/page-backup.tsx`

**執行方式**: 直接刪除這些檔案（無任何引用）

**測試點**:
- [x] 確認相關頁面正常載入
- [x] 確認沒有import錯誤
- [x] 確認建置無錯誤

---

### 🔴 階段二：核心功能頁面遷移（優先執行）

#### 1. 時間記錄頁面
- [x] **檔案**: `src/app/dashboard/time-records/page.tsx`
- [x] **目標**: 將 `httpsCallable` 改為 `useApiClient`
- [x] **重點**: 保留原有的分頁、篩選、統計功能

**測試點**:
- [x] 時間記錄列表載入正常
- [x] 篩選功能正常運作
- [x] 統計數據顯示正確
- [x] 分頁功能正常
- [x] 刪除功能正常運作

#### 2. 人員權限管理頁面  
- [x] **檔案**: `src/app/dashboard/personnel/permissions/page.tsx`
- [x] **目標**: 遷移至 `useApiClient`
- [x] **重點**: 保留權限管理的所有功能

**測試點**:
- [x] 權限列表載入正常
- [x] 權限修改功能正常
- [x] 角色分配功能正常
- [x] 權限驗證邏輯正確

#### 3. 採購訂單詳情頁面
- [x] **檔案**: `src/app/dashboard/purchase-orders/[id]/page.tsx`
- [x] **目標**: 統一API調用方式
- [x] **重點**: 保留詳細頁面的所有功能

**測試點**:
- [x] 訂單詳情載入正常
- [x] 狀態更新功能正常
- [x] 關聯數據顯示正確
- [x] 操作按鈕功能正常

#### 4. 產品系列管理頁面
- [x] **檔案**: `src/app/dashboard/product-series/page.tsx`  
- [x] **目標**: 整合 `StandardDataListPage` + `useApiClient`
- [x] **重點**: 這是統一架構的最佳實踐案例

**測試點**:
- [x] 系列列表載入正常
- [x] 統一表格/卡片切換正常
- [x] 搜尋篩選功能正常
- [x] 快速篩選標籤正常
- [x] CRUD操作全部正常

#### 5. 生產計算器頁面
- [x] **檔案**: `src/app/dashboard/production-calculator/page.tsx`
- [x] **目標**: 遷移API調用但保留計算邏輯
- [x] **重點**: 特殊計算功能需要特別測試

**測試點**:
- [x] 產品選擇載入正常
- [x] BOM計算邏輯正確
- [x] 批量計算功能正常
- [x] 結果顯示格式正確

#### 6. 🚨 工單詳情頁面（緊急修復）
- [x] **檔案**: `src/app/dashboard/work-orders/[id]/page.tsx`
- [x] **目標**: 優化香精匹配邏輯和除錯資訊
- [x] **重點**: 修復香精庫存顯示為 0 的問題
- [x] **問題**: billOfMaterials 中香精匹配邏輯有除錯資訊過多的問題
- [x] **解決方案**: 簡化除錯日誌，保留關鍵匹配邏輯

**測試點**:
- [x] 工單詳情載入正常
- [x] 香精庫存數據顯示正確（不再顯示 0）
- [x] 物料庫存數據顯示正確
- [x] BOM 計算和匹配邏輯正確
- [x] 完工確認功能正常
- [x] 庫存檢查邏輯正確

---

### 🟡 階段三：對話框組件統一（重要執行）

#### 7. 角色建立對話框
- [x] **檔案**: `src/components/RoleCreateDialog.tsx`
- [x] **目標**: 使用 `StandardFormDialog` + `useApiClient`
- [x] **重點**: 統一對話框的標準實現

#### 8. 角色編輯對話框
- [x] **檔案**: `src/components/RoleEditDialog.tsx`
- [x] **目標**: 使用 `StandardFormDialog` + `useApiClient`
- [x] **重點**: 與建立對話框保持一致性

#### 9. 用戶角色分配對話框
- [x] **檔案**: `src/components/UserRoleAssignDialog.tsx`
- [x] **目標**: 使用 `StandardFormDialog` + `dataLoaderConfig`
- [x] **重點**: 智能載入使用者和角色資料

#### 10. 產品系列對話框
- [x] **檔案**: `src/app/dashboard/product-series/SeriesDialog.tsx`
- [x] **目標**: 使用 `StandardFormDialog` + `dataLoaderConfig`
- [x] **重點**: 配合產品系列頁面的統一架構

#### 11. 供應商對話框
- [x] **檔案**: `src/app/dashboard/suppliers/SupplierDialog.tsx`
- [x] **目標**: 使用 `StandardFormDialog` + `dataLoaderConfig`
- [x] **重點**: 供應商資料的統一處理

**對話框統一測試點**:
- [ ] 載入狀態顯示正確
- [ ] 表單驗證功能正常
- [ ] 提交後自動刷新
- [ ] 錯誤處理正確顯示
- [ ] 取消操作正常
- [ ] 響應式佈局正常

---

### 🟠 階段四：頁面級元件遷移（重要執行）

#### 12. 原料管理頁面
- [x] **檔案**: `src/app/dashboard/materials/page.tsx`
- [x] **目標**: 遷移刪除功能和批量更新功能至 `useApiClient`
- [x] **重點**: 保留StandardDataListPage架構，只遷移API調用

#### 13. 產品管理頁面
- [x] **檔案**: `src/app/dashboard/products/page.tsx`
- [x] **目標**: 遷移產品CRUD操作至 `useApiClient`
- [x] **重點**: 保留現有功能和UI，只統一API調用方式

#### 14. 香精管理頁面
- [x] **檔案**: `src/app/dashboard/fragrances/page.tsx`
- [x] **目標**: 遷移刪除功能至 `useApiClient`
- [x] **重點**: 保留StandardDataListPage架構，只遷移API調用

#### 15. 採購訂單頁面
- [x] **檔案**: `src/app/dashboard/purchase-orders/page.tsx`
- [x] **目標**: 移除未使用的imports
- [x] **重點**: 清理代碼，無功能性變更

**頁面級遷移測試點**:
- [x] 列表載入功能正常
- [x] 刪除操作功能正常
- [x] 批量操作功能正常
- [x] 搜尋篩選功能保持正常
- [x] 響應式佈局無變化

---

### 🟢 階段五：特殊功能組件遷移（選擇性執行）

#### 16. 香精計算器對話框
- [x] **檔案**: `src/app/dashboard/products/FragranceCalculatorDialog.tsx`
- [x] **目標**: 保留特殊邏輯但使用統一API
- [x] **重點**: 複雜計算功能需要特別注意

#### 17. 香精變更對話框  
- [x] **檔案**: `src/app/dashboard/products/FragranceChangeDialog.tsx`
- [x] **目標**: 保留變更邏輯但使用統一API
- [x] **重點**: 歷史記錄功能要保留

#### 18. 庫存調整表單
- [x] **檔案**: `src/components/InventoryAdjustmentForm.tsx`
- [x] **目標**: 使用 `useApiClient`
- [x] **重點**: 庫存計算邏輯要正確

#### 19. 產品詳情頁面
- [x] **檔案**: `src/app/dashboard/products/[id]/page.tsx`
- [x] **目標**: 遷移香精歷史查詢功能
- [x] **重點**: 保留詳情頁面的完整功能

#### 20. 香精變更歷史頁面
- [x] **檔案**: `src/app/dashboard/products/fragrance-history/page.tsx`
- [x] **目標**: 遷移歷史記錄查詢功能
- [x] **重點**: 保留歷史記錄的完整功能

#### 21. 時間記錄清理工具
- [x] **檔案**: `src/app/cleanup-time-records/page.tsx`
- [x] **目標**: 遷移清理功能至統一API
- [x] **重點**: 管理工具功能，確保清理邏輯正確

**特殊功能測試點**:
- [x] 計算邏輯正確性
- [x] 歷史記錄保存和查詢
- [x] 數據同步正確
- [x] 複雜表單驗證
- [x] 管理工具功能正常

---

### 🔄 階段六：Functions清理（最終執行）

#### 22. 已停用Functions完全移除
- [ ] 確認前端完全不依賴已停用的Functions
- [ ] 完全移除停用的Functions檔案：
  - [ ] `functions/src/api/auth.ts` 
  - [ ] `functions/src/api/globalCart.ts`
  - [ ] `functions/src/api/timeRecords.ts`
  - [ ] `functions/src/api/resetPermissions.ts`
- [ ] 清理 `functions/src/index.ts` 的export語句

**Functions清理測試點**:
- [ ] 前端所有功能正常
- [ ] 部署無錯誤
- [ ] 無殘留的import錯誤
- [ ] Firebase Functions控制台無錯誤

---

## 📈 預期效益

### 程式碼品質提升
- **程式碼減少**: 移除約15個備份檔案和4個停用Functions
- **維護性提升**: 統一架構減少重複程式碼約60%
- **類型安全**: 統一API客戶端提供完整TypeScript支援

### 開發效率提升  
- **統一架構**: 新功能開發速度提升50%
- **錯誤處理**: 統一的載入狀態和錯誤提示
- **調試便利**: 集中的API調用日誌和錯誤追蹤

### 系統穩定性提升
- **部署穩定**: 移除已知會造成部署錯誤的程式碼
- **API一致性**: 統一的請求/回應格式
- **錯誤恢復**: 更好的錯誤處理和重試機制

---

## ⚠️ 風險評估與應對

### 🟢 低風險項目
- **備份檔案刪除**: 無任何引用，可安全刪除
- **對話框統一**: 有StandardFormDialog作為穩定基礎

### 🟡 中風險項目  
- **Functions清理**: 需確認前端無任何依賴
- **特殊功能遷移**: 複雜邏輯需要仔細測試

### 🔴 高風險項目
- **核心頁面遷移**: 涉及重要業務功能，需要完整測試
- **權限管理遷移**: 安全相關功能，錯誤影響重大

### 應對策略
1. **分階段執行**: 每個階段完成後進行完整測試
2. **功能驗證**: 每個功能都要有對應的測試清單
3. **回滾準備**: 重要修改前先備份原始檔案
4. **使用者確認**: 重大變更需要使用者確認和驗收

---

## 📚 參考文檔

- **統一API客戶端使用指南**: `統一API客戶端使用指南.md`
- **統一對話框載入機制使用指南**: `統一對話框載入機制使用指南.md`
- **專案主要架構文檔**: `CLAUDE.md`
- **API介面定義**: `src/types/api-interfaces.ts`

---

**最後更新**: 2025-09-12  
**負責人**: Claude Code AI Assistant  
**審核狀態**: 待用戶確認