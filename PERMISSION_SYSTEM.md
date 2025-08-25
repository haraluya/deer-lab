# 權限系統說明

## 概述

新的權限系統基於角色的權限列表進行檢查，而不是硬編碼的角色名稱。這樣可以更靈活地管理權限，即使角色名稱改變也不會影響功能。

## 權限檢查流程

### 1. 基本權限檢查函數

```typescript
checkPermission(uid: string, requiredPermission: string)
```

這個函數會：
1. 檢查使用者是否已登入
2. 獲取使用者的角色資料
3. 檢查角色的權限列表是否包含所需權限
4. 記錄詳細的權限檢查日誌

### 2. 具體權限檢查函數

針對不同功能模組，提供了專門的權限檢查函數：

- `ensureCanManagePersonnel()` - 人員管理權限
- `ensureCanManageRoles()` - 角色管理權限
- `ensureCanManageMaterials()` - 物料管理權限
- `ensureCanManageSuppliers()` - 供應商管理權限
- `ensureCanManageProducts()` - 產品管理權限
- `ensureCanManageWorkOrders()` - 工單管理權限
- `ensureCanManagePurchaseOrders()` - 採購管理權限
- `ensureCanManageInventory()` - 庫存管理權限
- `ensureCanViewReports()` - 報表查看權限

## 權限列表

### 系統管理權限
- `查看系統總覽`
- `新增人員`
- `編輯人員`
- `刪除人員`
- `查看人員管理`
- `新增角色`
- `編輯角色`
- `刪除角色`
- `查看角色管理`

### 基礎資料管理權限
- `查看物料管理`
- `新增物料`
- `編輯物料`
- `刪除物料`
- `查看香精管理`
- `新增香精`
- `編輯香精`
- `刪除香精`
- `查看產品管理`
- `新增產品`
- `編輯產品`
- `刪除產品`

### 生產作業管理權限
- `查看工單管理`
- `新增工單`
- `編輯工單`
- `刪除工單`
- `查看庫存管理`
- `調整庫存`
- `查看採購管理`
- `新增採購單`
- `編輯採購單`
- `確認入庫`

### 數據分析權限
- `查看報表分析`
- `查看成本管理`

## 使用範例

### 在 Firebase Functions 中使用

```typescript
import { ensureCanManagePersonnel } from "../utils/auth";

export const createPersonnel = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  
  // 檢查是否具有人員管理權限
  await ensureCanManagePersonnel(contextAuth?.uid);
  
  // 執行人員新增邏輯...
});
```

### 檢查特定權限

```typescript
import { checkPermission } from "../utils/auth";

export const someFunction = onCall(async (request) => {
  const { auth: contextAuth } = request;
  
  // 檢查是否具有特定權限
  await checkPermission(contextAuth?.uid, "新增物料");
  
  // 執行相關邏輯...
});
```

## 權限檢查日誌

系統會記錄詳細的權限檢查日誌：

### 成功案例
```
權限檢查成功: 使用者 admin 具有權限 新增人員
```

### 失敗案例
```
權限檢查失敗: 使用者 user123 需要權限 新增人員，但只有權限: ["查看物料管理", "編輯物料"]
```

## 向後兼容性

為了保持向後兼容性，保留了舊的函數名稱：

- `ensureIsAdmin()` → 現在檢查「新增人員」權限
- `ensureIsAdminOrForeman()` → 現在檢查「新增工單」權限

## 測試權限系統

使用 `scripts/test-permissions.js` 來測試權限檢查：

```bash
node scripts/test-permissions.js
```

## 重要提醒

1. **權限檢查順序**：先檢查登入狀態，再檢查角色存在，最後檢查具體權限
2. **錯誤訊息**：提供詳細的錯誤訊息，幫助診斷權限問題
3. **日誌記錄**：所有權限檢查都會記錄到 Firebase Functions 日誌中
4. **靈活性**：可以隨時修改角色名稱而不影響權限檢查
5. **安全性**：每個功能都需要明確的權限檢查

## 常見問題

### Q: 為什麼我的「系統管理員」角色無法新增人員？
A: 請檢查該角色的權限列表是否包含「新增人員」權限。

### Q: 如何添加新的權限？
A: 在角色管理中為角色添加新的權限項目，然後在 Firebase Functions 中使用 `checkPermission()` 檢查該權限。

### Q: 權限檢查失敗怎麼辦？
A: 查看 Firebase Functions 日誌，會顯示詳細的權限檢查失敗原因。
