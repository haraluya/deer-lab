# 部署說明

## 專案部署流程

這個專案使用 GitHub Actions 自動部署到 Firebase Hosting。

### 前置需求

1. **GitHub 專案**: https://github.com/haraluya/deer-lab
2. **Firebase 專案**: deer-lab
3. **Node.js**: 版本 18 或以上

### 部署步驟

#### 1. Firebase 設定

1. 登入 Firebase Console: https://console.firebase.google.com/
2. 選擇 `deer-lab` 專案
3. 在左側選單中點擊 "Hosting"
4. 如果尚未設定，點擊 "Get started"
5. 選擇 "Use an existing project" 並選擇 `deer-lab`

#### 2. 取得 Firebase Token

在本地端執行以下命令：

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 取得部署 token
firebase login:ci
```

複製產生的 token。

#### 3. GitHub Secrets 設定

1. 前往 GitHub 專案: https://github.com/haraluya/deer-lab
2. 點擊 "Settings" 標籤
3. 在左側選單中點擊 "Secrets and variables" → "Actions"
4. 點擊 "New repository secret"
5. 名稱輸入: `FIREBASE_TOKEN`
6. 值輸入: 步驟 2 取得的 token
7. 點擊 "Add secret"

#### 4. 推送程式碼

```bash
# 確保在主分支
git checkout main

# 添加所有變更
git add .

# 提交變更
git commit -m "Setup deployment configuration"

# 推送到 GitHub
git push origin main
```

#### 5. 自動部署

推送程式碼後，GitHub Actions 會自動：
1. 建置 Next.js 應用程式
2. 部署到 Firebase Hosting
3. 提供部署網址

### 手動部署

如果需要手動部署：

```bash
# 安裝依賴
npm install

# 建置專案
npm run build

# 部署到 Firebase
npm run deploy
```

### 部署網址

部署完成後，您的應用程式將可在以下網址存取：
- https://deer-lab.web.app
- https://deer-lab.firebaseapp.com

### 故障排除

1. **建置失敗**: 檢查 Node.js 版本是否為 18+
2. **部署失敗**: 確認 Firebase token 是否正確設定
3. **權限問題**: 確認 Firebase 專案權限設定

### 注意事項

- 每次推送到 `main` 分支都會觸發自動部署
- 部署過程約需 2-5 分鐘
- 可以在 GitHub Actions 頁面查看部署狀態
