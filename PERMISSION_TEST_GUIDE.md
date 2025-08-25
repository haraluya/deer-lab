# 權限測試指南

## 問題分析

根據調試結果，問題的根本原因是：
- 您目前使用的「計時人員」角色沒有人員管理權限
- 權限檢查系統正常工作，但角色權限設定不正確

## 解決方案

### 方案 1: 修改角色權限（推薦）

為「計時人員」角色添加人員管理權限：

1. 前往角色管理頁面
2. 編輯「計時人員」角色
3. 添加以下權限之一：
   - `編輯人員` - 允許編輯現有人員
   - `新增人員` - 允許新增人員
   - `查看人員管理` - 允許查看人員管理頁面

### 方案 2: 使用具有權限的角色

使用以下具有人員管理權限的角色登入：
- 系統管理員
- 管理員
- 或任何具有人員管理權限的角色

### 方案 3: 創建測試帳號

使用測試腳本創建具有權限的測試帳號：

```bash
node scripts/setup-test-data.js
```

## 本地測試步驟

### 1. 啟動本地模擬器

```bash
firebase emulators:start --only functions,firestore
```

### 2. 設置測試資料

```bash
node scripts/setup-test-data.js
```

### 3. 測試權限檢查

```bash
node scripts/debug-permissions.js
```

### 4. 使用測試頁面

訪問：http://localhost:8081/test-permissions.html

測試帳號：
- 測試管理員: admin001@deer-lab.local / 123456
- 測試計時人員: hourly001@deer-lab.local / 123456

## 權限檢查邏輯

### 當前權限檢查流程

1. **檢查登入狀態** - 確保使用者已登入
2. **獲取角色資料** - 從 Firestore 讀取使用者角色
3. **檢查權限列表** - 驗證角色是否包含所需權限
4. **記錄詳細日誌** - 成功或失敗都會記錄

### 人員管理權限要求

要進行人員管理操作，角色需要具有以下權限之一：
- `新增人員`
- `編輯人員`
- `刪除人員`
- `查看人員管理`

### 權限檢查函數

```typescript
// 檢查是否具有人員管理權限
export const ensureCanManagePersonnel = async (uid: string | undefined) => {
  const personnelPermissions = ["新增人員", "編輯人員", "刪除人員", "查看人員管理"];
  
  for (const permission of personnelPermissions) {
    try {
      await checkPermission(uid, permission);
      return true;
    } catch (error) {
      // 繼續檢查下一個權限
    }
  }
  
  throw new HttpsError("permission-denied", "權限不足");
};
```

## 調試工具

### 1. 權限檢查腳本

```bash
node scripts/debug-permissions.js
```

### 2. 當前使用者權限檢查

```bash
node scripts/check-current-user-permissions.js
```

### 3. 本地測試

```bash
node scripts/test-local-permissions.js
```

## 常見問題

### Q: 為什麼我的「計時人員」角色無法編輯人員？
A: 因為「計時人員」角色沒有人員管理權限。請為該角色添加「編輯人員」權限。

### Q: 如何知道我的角色有哪些權限？
A: 使用 `scripts/check-current-user-permissions.js` 腳本檢查。

### Q: 權限檢查失敗怎麼辦？
A: 查看 Firebase Functions 日誌，會顯示詳細的權限檢查失敗原因。

### Q: 可以修改權限檢查邏輯嗎？
A: 可以，但建議保持權限檢查的嚴格性，而是正確設定角色權限。

## 測試結果

### 權限檢查測試結果

```
✅ 系統管理員: 有權限
✅ 管理員: 有權限
❌ 計時人員: 無權限
❌ 領班: 無權限
```

### 建議操作

1. **立即解決**: 為「計時人員」角色添加「編輯人員」權限
2. **長期規劃**: 建立完整的角色權限體系
3. **測試驗證**: 使用測試帳號驗證權限檢查功能

## 下一步

1. 修改角色權限設定
2. 測試人員管理功能
3. 確認權限檢查正常工作
4. 部署到生產環境
