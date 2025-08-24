# 🔥 Google Cloud 設定指南

## 📋 必須啟用的 Google Cloud API

您的 Firebase 專案 `deer-lab` 需要啟用以下 Google Cloud API 才能正常運作：

### 🚨 **重要：這些 API 必須啟用**

**1. Firebase 核心 API**
- [ ] **Firebase API** (`firebase.googleapis.com`)
- [ ] **Firebase Authentication API** (`identitytoolkit.googleapis.com`)
- [ ] **Firebase Hosting API** (`firebasehosting.googleapis.com`)
- [ ] **Cloud Firestore API** (`firestore.googleapis.com`)

**2. Cloud Functions 相關 API**
- [ ] **Cloud Functions API** (`cloudfunctions.googleapis.com`)
- [ ] **Cloud Build API** (`cloudbuild.googleapis.com`)
- [ ] **Cloud Run API** (`run.googleapis.com`)
- [ ] **Eventarc API** (`eventarc.googleapis.com`)
- [ ] **Pub/Sub API** (`pubsub.googleapis.com`)

**3. 基礎服務 API**
- [ ] **Cloud Storage API** (`storage.googleapis.com`)
- [ ] **Cloud Resource Manager API** (`cloudresourcemanager.googleapis.com`)
- [ ] **Service Usage API** (`serviceusage.googleapis.com`)
- [ ] **Identity and Access Management (IAM) API** (`iam.googleapis.com`)

## 🔧 啟用方法

### 方法 1：使用 Google Cloud Console

1. 前往 [Google Cloud Console API 程式庫](https://console.cloud.google.com/apis/library?project=deer-lab)
2. 搜尋每個 API 名稱
3. 點擊 API 名稱
4. 點擊「啟用」按鈕

### 方法 2：使用 gcloud CLI

```bash
# 安裝 gcloud CLI (如果還沒安裝)
# https://cloud.google.com/sdk/docs/install

# 登入
gcloud auth login

# 設定專案
gcloud config set project deer-lab

# 啟用所有必要的 API
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable eventarc.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable serviceusage.googleapis.com
gcloud services enable iam.googleapis.com
```

### 方法 3：使用 Firebase CLI

```bash
# 重新初始化 Firebase 專案 (會自動啟用必要的 API)
firebase init hosting
firebase init functions
```

## 🔍 檢查 API 狀態

### 使用 Google Cloud Console
1. 前往 [API 和服務 > 已啟用的 API](https://console.cloud.google.com/apis/dashboard?project=deer-lab)
2. 查看已啟用的 API 清單

### 使用 gcloud CLI
```bash
gcloud services list --enabled --project=deer-lab
```

## 🚨 常見問題

### 問題 1：API 未啟用錯誤
**錯誤訊息：** `API not enabled`
**解決方法：** 使用上述方法啟用對應的 API

### 問題 2：權限不足
**錯誤訊息：** `Permission denied`
**解決方法：** 
1. 確認您有專案擁有者或編輯者權限
2. 前往 [IAM 與管理](https://console.cloud.google.com/iam-admin?project=deer-lab) 檢查權限

### 問題 3：配額限制
**錯誤訊息：** `Quota exceeded`
**解決方法：**
1. 前往 [配額](https://console.cloud.google.com/apis/api/cloudfunctions.googleapis.com/quotas?project=deer-lab)
2. 申請增加配額

## 📝 重要連結

- **Google Cloud Console:** https://console.cloud.google.com/?project=deer-lab
- **API 程式庫:** https://console.cloud.google.com/apis/library?project=deer-lab
- **已啟用的 API:** https://console.cloud.google.com/apis/dashboard?project=deer-lab
- **IAM 與管理:** https://console.cloud.google.com/iam-admin?project=deer-lab
- **配額管理:** https://console.cloud.google.com/apis/api/cloudfunctions.googleapis.com/quotas?project=deer-lab

## ✅ 驗證清單

完成設定後，請確認：

- [ ] 所有 13 個 API 都已啟用
- [ ] Firebase Functions 可以正常部署
- [ ] Firebase Hosting 可以正常部署
- [ ] 應用程式可以正常登入和使用
- [ ] GitHub Actions 部署成功

## 🆘 需要協助？

如果遇到問題，請：
1. 檢查 Google Cloud Console 的錯誤日誌
2. 確認所有 API 都已啟用
3. 檢查 IAM 權限設定
4. 聯繫 Google Cloud 支援
