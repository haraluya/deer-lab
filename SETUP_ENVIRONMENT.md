# 🔧 環境設置指導

## 🚨 重要：您需要設置環境變數才能正常使用系統

從終端日誌可以看出，AuthContext 一直處於 `isLoading: true` 狀態，這表示用戶沒有登入。這是因為 Firebase 配置沒有正確設置。

## 📝 步驟 1：創建環境變數文件

在專案根目錄創建 `.env.local` 文件：

```bash
# 在專案根目錄執行
touch .env.local
```

## 📝 步驟 2：添加 Firebase 配置

將以下內容複製到 `.env.local` 文件中：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCMIAqNPsIyl3fJNllqNCuUJE2Rvcdf6fk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=deer-lab.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=deer-lab
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=deer-lab.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=554942047858
NEXT_PUBLIC_FIREBASE_APP_ID=1:554942047858:web:607d3e27bb438c898644eb

# 開發環境變數
NODE_ENV=development

# 其他配置
NEXT_PUBLIC_APP_NAME=Deer Lab Production Management System
```

## 📝 步驟 3：重新啟動開發伺服器

```bash
# 停止當前的開發伺服器 (Ctrl+C)
# 然後重新啟動
npm run dev
```

## 📝 步驟 4：測試登入

1. 打開瀏覽器訪問 `http://localhost:8080`
2. 您應該會看到登入頁面
3. 使用以下測試帳號登入：
   - 工號：`001`
   - 密碼：`password123`

## 🔍 測試權限系統

設置環境變數後，運行以下測試腳本：

```bash
# 測試登入狀態和權限系統
node scripts/test-login-status.js

# 測試完整權限系統
node scripts/test-permission-system-status.js
```

## 🚨 常見問題

### 問題 1：AuthContext 一直顯示 isLoading: true
**解決方案**：確保 `.env.local` 文件存在且配置正確

### 問題 2：登入失敗
**解決方案**：
1. 檢查 Firebase 配置是否正確
2. 確認用戶帳號存在
3. 檢查網路連接

### 問題 3：權限檢查失敗
**解決方案**：
1. 確保用戶有分配角色
2. 確保角色有正確的權限
3. 運行測試腳本檢查權限狀態

## 📊 預期結果

設置正確後，您應該看到：

1. **登入頁面**：可以正常登入
2. **Dashboard**：登入後自動跳轉到 dashboard
3. **權限檢查**：`canManagePersonnel()` 返回 `true`
4. **人員管理**：可以正常新增和編輯人員

## 🔧 調試工具

如果仍有問題，可以使用以下調試工具：

```bash
# 檢查登入狀態
node scripts/test-login-status.js

# 檢查權限系統
node scripts/test-permission-system-status.js

# 檢查用戶權限
node scripts/debug-user-permissions.js
```

## 📞 需要幫助？

如果按照以上步驟設置後仍有問題，請：

1. 檢查瀏覽器控制台錯誤訊息
2. 運行測試腳本並查看輸出
3. 確認 Firebase 專案配置正確
