# 環境設置說明

## 🔐 Firebase 配置

為了避免 API 金鑰外流，本專案使用環境變數來管理 Firebase 配置。

### 1. 創建環境變數文件

在專案根目錄創建 `.env.local` 文件：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 開發環境變數
NODE_ENV=development

# 其他配置
NEXT_PUBLIC_APP_NAME=Deer Lab Production Management System
```

### 2. 獲取 Firebase 配置

1. 登入 [Firebase Console](https://console.firebase.google.com/)
2. 選擇您的專案
3. 點擊專案設置 (⚙️)
4. 在「一般」標籤中找到「您的應用程式」區塊
5. 複製配置值到 `.env.local` 文件

### 3. 安全注意事項

- ✅ 將 `.env.local` 添加到 `.gitignore`
- ✅ 不要將真實的 API 金鑰提交到 Git
- ✅ 在生產環境中使用環境變數
- ❌ 不要在程式碼中硬編碼 API 金鑰

## 🚀 啟動專案

設置環境變數後，執行以下命令：

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 或使用 yarn
yarn dev
```

## 🔧 測試腳本

測試腳本已更新為使用模擬配置，不會暴露真實的 API 金鑰：

```bash
# 測試權限系統
node scripts/test-permissions.js

# 調試用戶權限
node scripts/debug-user-permissions.js
```

## 📝 注意事項

1. **環境變數前綴**: 所有客戶端可用的環境變數必須以 `NEXT_PUBLIC_` 開頭
2. **重新啟動**: 修改環境變數後需要重新啟動開發伺服器
3. **生產部署**: 確保在生產環境中正確設置環境變數

## 🆘 故障排除

如果遇到 Firebase 初始化錯誤：

1. 檢查環境變數是否正確設置
2. 確認 Firebase 專案配置
3. 檢查網路連接
4. 查看瀏覽器控制台錯誤訊息
