# 🗂️ Firebase Functions 版本清理指南

## 🚨 問題說明
每次部署 Firebase Functions 都會在 Artifact Registry 中儲存新版本，造成：
- **Artifact Registry 費用**：目前 $1.67/月且持續增長
- **Cloud Storage 費用**：舊版本佔用儲存空間

## 💰 費用影響
- 不清理的話，每個月可能增加 $2-5 費用
- 長期累積可能達到 $10-20/月

## 🔧 解決方案

### 方案 1：Google Cloud Console 手動設定（推薦）

1. **進入 Artifact Registry**：
   - 開啟 [Google Cloud Console](https://console.cloud.google.com)
   - 導航到「Artifact Registry」
   - 選擇專案「deer-lab」

2. **找到 Functions 儲存庫**：
   - 地區：`us-central1`
   - 儲存庫名稱：`gcf-artifacts`

3. **設定清理政策**：
   ```
   保留規則：
   - 保留最新 3 個版本
   - 刪除超過 7 天的舊版本
   ```

4. **設定步驟**：
   - 點擊儲存庫名稱
   - 選擇「清理政策」標籤
   - 點擊「建立政策」
   - 設定規則：
     * 規則 1：保留最新 3 個版本
     * 規則 2：刪除超過 7 天的版本

### 方案 2：使用 gcloud CLI（如果已安裝）

```bash
# 設定清理政策
gcloud artifacts repositories set-cleanup-policy gcf-artifacts \
  --location=us-central1 \
  --policy-file=gcloud-cleanup-policy.json
```

### 方案 3：Firebase 設定優化

在 `firebase.json` 中添加：
```json
{
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "runtime": "nodejs20",
    "maxInstances": 3
  }
}
```

## 🎯 立即清理動作

### 手動清理現有版本：

1. **Google Cloud Console**：
   - Artifact Registry → gcf-artifacts
   - 選擇舊版本的映像檔
   - 點擊「刪除」

2. **保留建議**：
   - 保留最新 3 個版本
   - 刪除 7 天前的版本

## 📊 預期節省

- **立即節省**：$1-2（清理現有舊版本）
- **長期節省**：每月 $2-5（避免無限累積）

## ⚠️ 注意事項

1. **不要全部刪除**：至少保留最新 1-2 個版本
2. **測試後再刪除**：確保新部署正常運作
3. **定期檢查**：建議每月檢查一次版本數量

## 🔄 自動化建議

設定 **Cloud Scheduler** 定期執行清理：
- 頻率：每週一次
- 動作：刪除超過 3 個版本的舊映像檔

---

**重要性**：這個優化雖然看似較小，但長期來說可能節省 10-20% 的總費用！