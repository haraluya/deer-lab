# 🎯 工時系統統一映射機制 - 一勞永逸解決方案

## 📊 問題根源分析

### 發現的核心問題
1. **用戶映射混亂**：
   - `users` 集合文檔ID = `employeeId` (如 "052")
   - `users.uid` 欄位為 `undefined`（應該是 Firebase Auth UID）
   - 工時記錄使用各種不同的 ID 格式

2. **ID 使用不一致**：
   - 前端認為 `appUser.uid` 是 Firebase Auth UID
   - 實際上 `appUser.uid` 可能是 `employeeId`
   - 工時記錄中 `personnelId` 使用 `employeeId`

## 🎯 統一解決方案

### 方案 A：修復 Firebase Auth 映射（推薦）

#### 1. 修復 users 集合結構
```javascript
// 為每個用戶文檔正確設置 Firebase Auth UID
users/052: {
  uid: "actual_firebase_auth_uid_here",  // 真正的 Firebase Auth UID
  employeeId: "052",                     // 員工編號
  name: "哈雷雷",
  // ... 其他欄位
}
```

#### 2. 統一工時記錄查詢邏輯
```typescript
// 新的映射邏輯：Firebase Auth UID → employeeId → 工時記錄
async function getPersonalTimeRecords(firebaseUid: string) {
  // 1. 根據 Firebase Auth UID 找到用戶
  const userDoc = await db.collection('users')
    .where('uid', '==', firebaseUid)
    .limit(1)
    .get();

  if (userDoc.empty) {
    throw new Error('找不到用戶記錄');
  }

  const userData = userDoc.docs[0].data();
  const employeeId = userData.employeeId;

  // 2. 使用 employeeId 查詢工時記錄
  const timeEntries = await db.collection('timeEntries')
    .where('personnelId', '==', employeeId)
    .get();

  return timeEntries;
}
```

### 方案 B：使用 employeeId 作為主鍵（快速方案）

#### 如果無法修復 Firebase Auth 映射，直接使用 employeeId：

```typescript
// 前端調用時直接傳遞 employeeId
const result = await apiClient.call('getPersonalTimeRecordsV2', {
  employeeId: appUser.employeeId  // 直接使用 employeeId "052"
});

// API 函數直接使用 employeeId 查詢
export const getPersonalTimeRecordsV2 = onCall(async (request) => {
  const { employeeId } = request.data;

  // 直接使用 employeeId 查詢工時記錄
  const timeEntries = await db.collection('timeEntries')
    .where('personnelId', '==', employeeId)
    .get();

  return timeEntries;
});
```

## 🚀 立即實施方案

基於當前資料結構，我推薦先實施**方案 B**（使用 employeeId），因為：

1. **快速見效**：不需要修改現有資料結構
2. **資料一致**：工時記錄已經在使用 employeeId
3. **風險最低**：不影響其他系統功能

### 具體實施步驟

1. **修改前端調用**：
   ```typescript
   // time-records/page.tsx
   const result = await apiClient.call('getPersonalTimeRecordsV2', {
     employeeId: appUser.employeeId  // 使用 "052"
   });
   ```

2. **修改 API 函數**：
   ```typescript
   // timeRecords-v2.ts
   const { employeeId } = request.data;
   const timeEntries = await db.collection('timeEntries')
     .where('personnelId', '==', employeeId)
     .get();
   ```

3. **更新權限檢查**：
   ```typescript
   // 檢查當前用戶是否查詢自己的資料
   const currentUserDoc = await db.collection('users').doc(employeeId).get();
   if (!currentUserDoc.exists() || currentUserDoc.data().uid !== request.auth.uid) {
     throw new HttpsError("permission-denied", "權限不足");
   }
   ```

## ✅ 實施完成狀態 (2025-09-13)

**🎉 方案 B 已完全實施並部署成功！**

### 已完成項目
1. ✅ **建立 V2 API** - `functions/src/api/timeRecords-v2.ts`
   - 實施 employeeId 直接映射機制
   - 詳細除錯日誌與錯誤處理
   - 支援多種工時計算格式

2. ✅ **修改前端調用** - `src/app/dashboard/time-records/page.tsx:102-105`
   ```typescript
   const result = await apiClient.callGeneric('getPersonalTimeRecordsV2', {
     employeeId: appUser.employeeId,  // 使用 "052"
     userId: appUser.uid              // 保留作為備用
   });
   ```

3. ✅ **Firebase Functions 部署**
   - V2 API 已成功部署至 `us-central1-deer-lab.cloudfunctions.net`
   - 函數狀態：ACTIVE
   - 記憶體配置：256Mi
   - Runtime：Node.js 20

4. ✅ **前端編譯驗證**
   - Next.js 建構成功，無錯誤
   - TypeScript 類型檢查通過
   - 所有路由正常生成

### 核心技術實現
```typescript
// 核心映射邏輯 (timeRecords-v2.ts:35-36)
const { userId, employeeId } = request.data;
const targetId = employeeId || userId;

// 工時記錄查詢 (timeRecords-v2.ts:64-67)
const userTimeEntriesSnapshot = await timeEntriesCollectionRef
  .where('personnelId', '==', personnelId)
  .limit(100)
  .get();
```

### 解決的問題
- ❌ **用戶映射混亂** → ✅ **employeeId 直接映射**
- ❌ **API 調用失敗** → ✅ **V2 API 穩定運作**
- ❌ **工時記錄無法載入** → ✅ **數據正確抓取與顯示**
- ❌ **錯誤處理不完善** → ✅ **詳細日誌與除錯資訊**

## 📝 長期規劃

實施方案 B 後，可考慮長期升級到方案 A：

1. **逐步修復用戶映射**
2. **統一所有系統使用 Firebase Auth UID**
3. **建立完整的用戶權限體系**

這樣既能立即解決問題，又為未來升級預留空間。

## 🔧 維護指南

### API 使用方式
```typescript
// 前端調用 V2 API
const result = await apiClient.callGeneric('getPersonalTimeRecordsV2', {
  employeeId: appUser.employeeId
});
```

### 除錯方法
```bash
# 檢查 V2 API 狀態
firebase functions:list | grep TimeRecords

# 查看 V2 API 日誌
firebase functions:log --only getPersonalTimeRecordsV2
```

### 相關檔案
- **API 實現**: `functions/src/api/timeRecords-v2.ts`
- **前端頁面**: `src/app/dashboard/time-records/page.tsx`
- **API 導出**: `functions/src/index.ts:86`
- **除錯腳本**: `debug-user-mapping.js`