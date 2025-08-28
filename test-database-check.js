// 測試資料庫中的香精資料
// 這個腳本可以用來檢查資料庫中實際儲存的資料

const testData = {
  "TEST001": {
    name: "測試香精1",
    code: "TEST001",
    fragranceType: "棉芯",
    fragranceStatus: "啟用",
    supplierName: "真味生技",
    safetyStockLevel: 100,
    costPerUnit: 15.5,
    percentage: 5,
    currentStock: 50,
    unit: "KG"
  },
  "TEST002": {
    name: "測試香精2", 
    code: "TEST002",
    fragranceType: "陶瓷芯",
    fragranceStatus: "備用",
    supplierName: "恆云生技",
    safetyStockLevel: 200,
    costPerUnit: 20.0,
    percentage: 8,
    currentStock: 75,
    unit: "KG"
  },
  "TEST003": {
    name: "測試香精3",
    code: "TEST003",
    fragranceType: "", // 空值
    fragranceStatus: "", // 空值
    supplierName: "真味生技",
    safetyStockLevel: 150,
    costPerUnit: 18.0,
    percentage: 6,
    currentStock: 60,
    unit: "KG"
  }
};

console.log("測試資料結構:");
Object.keys(testData).forEach(code => {
  const data = testData[code];
  console.log(`${code}:`, {
    fragranceType: data.fragranceType,
    fragranceStatus: data.fragranceStatus,
    hasFragranceType: !!data.fragranceType,
    hasFragranceStatus: !!data.fragranceStatus,
    fragranceTypeLength: data.fragranceType?.length || 0,
    fragranceStatusLength: data.fragranceStatus?.length || 0
  });
});

// 模擬前端處理邏輯
console.log("\n模擬前端處理邏輯:");
Object.keys(testData).forEach(code => {
  const data = testData[code];
  
  // 模擬前端的處理邏輯
  const fragranceType = data.fragranceType !== undefined && data.fragranceType !== null && data.fragranceType !== '' ? data.fragranceType : '未指定';
  const fragranceStatus = data.fragranceStatus !== undefined && data.fragranceStatus !== null && data.fragranceStatus !== '' ? data.fragranceStatus : '未指定';
  
  console.log(`${code} 處理結果:`, {
    originalFragranceType: data.fragranceType,
    processedFragranceType: fragranceType,
    originalFragranceStatus: data.fragranceStatus,
    processedFragranceStatus: fragranceStatus
  });
});

// 模擬後端處理邏輯
console.log("\n模擬後端處理邏輯:");
Object.keys(testData).forEach(code => {
  const data = testData[code];
  
  // 模擬後端的處理邏輯
  let finalFragranceType;
  if (data.fragranceType !== undefined && data.fragranceType !== null && data.fragranceType !== '') {
    finalFragranceType = data.fragranceType;
  } else {
    finalFragranceType = '棉芯'; // 預設值
  }
  
  let finalFragranceStatus;
  if (data.fragranceStatus !== undefined && data.fragranceStatus !== null && data.fragranceStatus !== '') {
    finalFragranceStatus = data.fragranceStatus;
  } else {
    finalFragranceStatus = '啟用'; // 預設值
  }
  
  console.log(`${code} 後端處理結果:`, {
    originalFragranceType: data.fragranceType,
    finalFragranceType: finalFragranceType,
    originalFragranceStatus: data.fragranceStatus,
    finalFragranceStatus: finalFragranceStatus
  });
});
