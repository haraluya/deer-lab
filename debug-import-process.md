# 香精匯入功能調試指南

## 問題描述
香精匯入功能無法正確匯入香精種類和啟用狀態欄位，在香精清單中顯示「未指定」。

## 調試步驟

### 1. 檢查 CSV 檔案解析
在瀏覽器控制台中執行以下代碼，檢查 CSV 檔案是否正確解析：

```javascript
// 檢查 CSV 檔案內容
const csvContent = `香精代號,香精名稱,香精種類,啟用狀態,供應商,安全庫存,單位成本,香精比例,PG比例,VG比例,目前庫存,單位
TEST001,測試香精1,棉芯,啟用,真味生技,100,15.5,5,80,20,50,KG
TEST002,測試香精2,陶瓷芯,備用,恆云生技,200,20.0,8,70,30,75,KG
TEST003,測試香精3,,,真味生技,150,18.0,6,75,25,60,KG`;

// 使用 Papa Parse 解析
const result = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
console.log('CSV 解析結果:', result.data);

// 檢查第一筆資料
const firstRow = result.data[0];
console.log('第一筆資料:', firstRow);
console.log('香精種類:', firstRow['香精種類']);
console.log('啟用狀態:', firstRow['啟用狀態']);
```

### 2. 檢查欄位匹配邏輯
檢查欄位是否正確匹配：

```javascript
// 模擬欄位匹配邏輯
const fields = [
  { key: "fragranceType", label: "香精種類" },
  { key: "fragranceStatus", label: "啟用狀態" }
];

const row = {
  "香精種類": "棉芯",
  "啟用狀態": "啟用"
};

fields.forEach(field => {
  let value = row[field.key] || row[field.label];
  console.log(`欄位 ${field.label}:`, {
    key: field.key,
    label: field.label,
    value: value,
    hasValue: !!value
  });
});
```

### 3. 檢查資料庫中的實際資料
在 Firebase Console 中檢查 `fragrances` 集合，查看實際儲存的資料結構。

### 4. 檢查前端載入邏輯
在香精管理頁面打開瀏覽器控制台，查看載入資料時的調試日誌。

### 5. 檢查後端處理邏輯
在 Firebase Functions 日誌中查看 `updateFragranceByCode` 和 `createFragrance` 函數的執行日誌。

## 預期結果

### 正確的資料流程：
1. CSV 檔案解析 → 正確識別欄位
2. 欄位匹配 → 正確映射到 fragranceType 和 fragranceStatus
3. 前端處理 → 正確傳遞到後端
4. 後端處理 → 正確儲存到資料庫
5. 前端載入 → 正確顯示資料

### 可能的問題點：
1. CSV 欄位名稱不匹配
2. 空值處理邏輯錯誤
3. 資料傳遞過程中欄位丟失
4. 資料庫儲存時欄位未正確保存

## 調試命令

### 在瀏覽器控制台中執行：
```javascript
// 檢查當前頁面的香精資料
console.log('當前香精資料:', window.fragrances || '未找到');

// 檢查匯入對話框的欄位定義
console.log('匯入欄位定義:', window.importFields || '未找到');
```

### 在 Firebase Console 中：
1. 進入 Firestore Database
2. 查看 `fragrances` 集合
3. 檢查 TEST001, TEST002, TEST003 等測試資料的結構
4. 確認 `fragranceType` 和 `fragranceStatus` 欄位是否存在及其值
