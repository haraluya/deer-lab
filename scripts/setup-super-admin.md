# 超級管理員設置指南

## 目的
超級管理員帳號是為了防止所有管理員帳號被刪除而無法登入系統的安全措施。實際上，任何擁有「管理員」角色的使用者都可以進行人員管理操作。

## 手動設置步驟

### 1. 創建超級管理員 Firebase Auth 帳號
1. 前往 [Firebase Console](https://console.firebase.google.com/project/deer-lab)
2. 點擊「Authentication」→「Users」
3. 點擊「添加用戶」
4. 輸入以下資訊：
   - **工號**: `admin`
   - **電子郵件**: `admin@deer-lab.local`
   - **密碼**: `admin123456`
   - **顯示名稱**: `超級管理員`

### 2. 創建超級管理員角色
1. 前往「Firestore Database」
2. 在 `roles` 集合中新增文件：
   ```json
   {
     "name": "超級管理員",
     "description": "擁有系統所有權限，可進行完整的管理操作",
     "permissions": [
       "users.read", "users.write", "users.delete",
       "roles.read", "roles.write", "roles.delete",
       "materials.read", "materials.write", "materials.delete",
       "suppliers.read", "suppliers.write", "suppliers.delete",
       "products.read", "products.write", "products.delete",
       "workOrders.read", "workOrders.write", "workOrders.delete",
       "purchaseOrders.read", "purchaseOrders.write", "purchaseOrders.delete",
       "inventory.read", "inventory.write", "inventory.delete",
       "reports.read", "reports.write",
       "system.read", "system.write", "system.delete"
     ],
     "createdAt": "2024-01-01T00:00:00.000Z"
   }
   ```

### 3. 創建超級管理員使用者資料
1. 在 `users` 集合中新增文件，ID 為 `admin`：
   ```json
   {
     "name": "超級管理員",
     "employeeId": "admin",
     "phone": "0900000000",
     "roleRef": "roles/[剛才創建的角色ID]",
     "status": "active",
     "createdAt": "2024-01-01T00:00:00.000Z",
     "updatedAt": "2024-01-01T00:00:00.000Z"
   }
   ```

## 登入資訊
- **工號**: `admin`
- **密碼**: `admin123456`
- **電話**: `0900000000`

## 重要提醒
1. 請妥善保管超級管理員密碼
2. 建議首次登入後立即修改密碼
3. 超級管理員帳號僅作為備用，平時應使用一般管理員帳號
4. 任何擁有「管理員」角色的使用者都可以進行人員管理操作
