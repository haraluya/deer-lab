# 香精匯入功能修復部署指南

## 問題描述

香精的匯入功能無法正確匯入香精種類和啟用狀態欄位。當 CSV 檔案中包含空的香精種類或啟用狀態欄位時，這些欄位不會被正確處理和儲存到資料庫中。

## 修復內容

### 1. 前端修復 (src/app/dashboard/fragrances/page.tsx)

**問題**: 在匯入處理邏輯中，`fragranceType` 和 `fragranceStatus` 欄位只有在有實際值時才會被添加到 `processedItem` 物件中。

**修復**:
- 修改匯入處理邏輯，確保即使為空也要傳遞這些欄位到後端
- 將空的 `fragranceType` 和 `fragranceStatus` 值統一設置為空字串
- 使用 `any` 類型來避免 TypeScript 錯誤

```typescript
// 處理香精種類 - 即使為空也要傳遞，讓後端處理預設值
processedItem.fragranceType = fragranceType;

// 處理啟用狀態 - 即使為空也要傳遞，讓後端處理預設值
processedItem.fragranceStatus = fragranceStatus;
```

### 2. 後端修復 (functions/src/api/fragrances.ts)

**問題**: 後端 API 在處理空的 `fragranceType` 和 `fragranceStatus` 值時，會跳過更新這些欄位。

**修復**:
- 更新 `FragranceData` 介面，添加缺少的 `supplierId` 和 `currentStock` 欄位
- 修改 `createFragrance` 函數，將預設值改為中文
- 修改 `updateFragrance` 函數，將預設值改為中文
- 修改 `updateFragranceByCode` 函數，確保能正確處理空的欄位值

```typescript
// 處理向後相容性
const finalFragranceType = fragranceType || status || '棉芯';
const finalFragranceStatus = fragranceStatus || '啟用';

// 如果沒有提供香精種類，使用預設值
if (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') {
  updateData.fragranceType = fragranceType;
} else {
  updateData.fragranceType = '棉芯';
}
```

### 3. 匯入對話框修復 (src/components/ImportExportDialog.tsx)

**問題**: CSV 檔案解析時，空值處理不一致，且欄位匹配邏輯不夠靈活。

**修復**:
- 統一處理空值，將 `undefined`、`null`、空字串統一為空字串
- 改善欄位匹配邏輯，支援模糊匹配
- 添加更詳細的調試日誌

```typescript
// 嘗試多種方式匹配欄位值
let value = row[field.key] || row[field.label]

// 如果還是沒有找到，嘗試模糊匹配
if (value === undefined || value === null || value === '') {
  const rowKeys = Object.keys(row)
  const matchedKey = rowKeys.find(key => 
    key.toLowerCase().includes(field.key.toLowerCase()) ||
    key.toLowerCase().includes(field.label.toLowerCase())
  )
  if (matchedKey) {
    value = row[matchedKey]
  }
}
```

## 部署步驟

### 1. 部署 Firebase Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 2. 部署前端應用
```bash
npm run build
firebase deploy --only hosting
```

## 測試驗證

### 1. 測試匯入功能
1. 使用提供的測試檔案 `test-fragrances-import.csv`
2. 在香精管理頁面使用匯入功能
3. 驗證空的欄位是否被正確處理（使用預設值）

### 2. 測試更新功能
1. 匯入包含現有香精代號的資料
2. 驗證香精種類和啟用狀態是否被正確更新

### 3. 測試新增功能
1. 匯入新的香精資料
2. 驗證香精種類和啟用狀態是否被正確設定

### 4. 測試案例說明
測試檔案包含以下情況：
- **TEST001**: 完整資料，所有欄位都有值
- **TEST002**: 完整資料，使用不同的香精種類和狀態
- **TEST003**: 空的香精種類和啟用狀態（應該使用預設值）
- **TEST004**: 空的供應商欄位
- **TEST005**: 部分空的香精種類和啟用狀態

## 預設值設定

- **香精種類預設值**: `棉芯`
- **啟用狀態預設值**: `啟用`

## 注意事項

1. **向後相容性**: 系統會自動處理舊資料格式
2. **空值處理**: 空的欄位會被設置為預設值，而不是跳過更新
3. **中文支援**: 所有預設值都使用中文，符合使用者介面語言

## 部署狀態

- ✅ Firebase Functions 已部署
- ✅ 前端應用已部署
- ✅ 所有修復已完成

## 部署時間

2024年12月19日

## 相關檔案

- `src/app/dashboard/fragrances/page.tsx` - 香精管理頁面
- `functions/src/api/fragrances.ts` - 香精 API
- `src/components/ImportExportDialog.tsx` - 匯入匯出對話框
- `test-fragrances-import.csv` - 測試用 CSV 檔案
