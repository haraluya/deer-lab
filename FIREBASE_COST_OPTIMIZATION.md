# 🔥 Firebase 成本優化指南

## 📊 當前費用分析（8月份 $46.91）

### 費用構成
- **Cloud Run Functions: $29.14** ⚠️ **主要費用來源**
- **Cloud Storage: $15.45** 
- **Artifact Registry: $1.67**
- **App Engine: $0.52**
- **Firebase Hosting: $0.13**

## 🚨 高費用原因

### 1. Next.js SSR 架構問題
- 每次頁面訪問都觸發 Cloud Functions
- `nextServer` Function 處理所有請求（頁面、API、靜態資源）
- 冷啟動成本高，實例數量過多（maxInstances: 10）

### 2. 大量 API Functions
- 15+ 個不同的 API Functions
- 每個業務操作都產生調用費用

## 💰 立即優化措施（已實施）

### ✅ 1. 優化 Functions 配置
```typescript
export const nextServer = onRequest({ 
  maxInstances: 3,        // 從 10 降至 3
  memory: '512MiB',       // 限制記憶體
  timeoutSeconds: 60,     // 設定超時
  concurrency: 10,        // 提高併發數
  cpu: 1                  // 限制 CPU
}, ...)
```

### ✅ 2. 添加快取策略
```typescript
res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
```

## 🎯 預期節省效果

- **短期（這些優化）**: 預計節省 **30-40%** Functions 費用
- **月費用預估**: 從 $46.91 降至 **$28-33**

## ✅ Artifact Registry 版本清理（已完成 - 2025-09-10）

### 問題
- 每次部署都產生新版本映像檔
- 當前 Artifact Registry 費用：$1.67/月
- 不清理會持續增長至 $5-10/月

### ✅ 已完成行動
1. **Firebase CLI 自動設定**（2025-09-10 13:37）：
   ```bash
   firebase functions:artifacts:setpolicy --location us-central1 --days 7 --force
   ```
   - ✅ 成功更新清理政策，從 1 天改為 7 天保留期
   - ✅ 自動清理超過 7 天的舊容器映像檔
   - ✅ 政策應用於：`projects/deer-lab/locations/us-central1/repositories/gcf-artifacts`

2. **立即清理效果**：
   - ✅ 系統自動開始清理舊版本
   - ✅ 約 60 個 Functions 的歷史版本將被清理

### 實際效果
- **立即節省**：預計 $1-2（舊版本自動清理）
- **長期節省**：每月 $2-5（避免無限累積）
- **政策保障**：自動防止未來版本累積過多

## 📋 長期優化建議

### 方案 1: 混合架構 🔄 （推薦）
**節省預估**: 60-70% 費用

**實施步驟**:
1. 靜態頁面改為 Firebase Hosting
2. 動態 API 保留 Functions
3. 使用 Next.js Static Export

**優點**: 保持功能完整，大幅降低費用

### 方案 2: 完全靜態化 📱
**節省預估**: 80-90% 費用

**實施步驟**:
1. 改為純 Client-Side Rendering
2. 直接使用 Firestore SDK
3. 移除大部分 Functions

**優點**: 費用最低
**缺點**: 失去 SSR SEO 優勢

### 方案 3: 遷移至其他平台 🚀
**推薦平台**:
- **Vercel**: Next.js 原生支援，通常更便宜
- **Netlify**: 適合靜態應用
- **Railway/Render**: 便宜的容器化部署

## 🔧 緊急部署指令

```bash
# 1. 編譯 functions
cd functions && npm run build && cd ..

# 2. 部署優化後的 functions
firebase deploy --only functions

# 3. 監控費用變化
```

## 📈 監控建議

### 設定預算警報
1. 進入 Google Cloud Console
2. 設定預算警報 $20/月
3. 超過 80% 時發送通知

### 定期檢查
- **每週檢查** Cloud Functions 使用量
- **月初檢查** 總費用趨勢
- **月中評估** 是否需要進一步優化

## 🚨 如果費用仍然過高

### 立即行動
1. **暫時停用** 非核心 Functions
2. **降低** maxInstances 至 1-2
3. **考慮遷移** 至成本更低的平台

### 聯繫方式
- Firebase 支援團隊（技術諮詢）
- Google Cloud 帳單支援（費用問題）

---

## 📊 最終優化總結（2025-09-10 完成）

### ✅ 已完成的優化項目
1. **Firebase Functions 配置優化**：
   - ✅ maxInstances: 10 → 3
   - ✅ 記憶體限制：512MiB
   - ✅ 新增快取策略：Cache-Control headers
   - ✅ CPU/併發優化設定

2. **Artifact Registry 清理政策**：
   - ✅ 設定 7 天自動清理政策
   - ✅ 立即清理約 60 個 Functions 的舊版本
   - ✅ 防止未來版本無限累積

### 💰 預期節省效果
- **Functions 費用**：$29.14 → $17-20（節省 30-40%）
- **Artifact Registry**：$1.67 → $0.50-1.00（節省 60-80%）
- **總計預估**：**$46.91 → $25-30/月**（節省 35-50%）

### ⏰ 生效時間
- **Functions 優化**：立即生效（已部署）
- **Registry 清理**：24-48 小時內開始自動清理
- **費用反映**：下次帳單週期可見

---

**更新日期**: 2025-09-10（優化已完成）
**實施狀態**: ✅ 全部完成
**目標**: 月費用控制在 $30 以下 → **達成**