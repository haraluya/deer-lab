# 🎨 Deer Lab 系統設計風格指導文件

## 📋 設計原則

### **核心價值**
- **專業性**：企業級管理系統的專業形象
- **一致性**：統一的視覺語言和交互模式
- **易用性**：直觀的操作流程和清晰的資訊架構
- **現代感**：採用當代設計趨勢和最佳實踐

### **設計哲學**
- **以用戶為中心**：優先考慮用戶的工作流程和需求
- **視覺層次**：通過顏色、大小、間距建立清晰的資訊層級
- **響應式設計**：確保在不同設備上都有良好的使用體驗

## 🎨 配色系統

### **主色調定義**

#### **藍色主題 (Blue) - 主要品牌色**
```
背景漸層: from-blue-50 to-indigo-50
邊框顏色: border-blue-200
標題文字: text-blue-800
圖標顏色: text-blue-600
按鈕背景: bg-blue-600 hover:bg-blue-700
圖標背景: bg-blue-100
```

#### **綠色主題 (Green) - 成功/正面操作**
```
背景漸層: from-green-50 to-emerald-50
邊框顏色: border-green-200
標題文字: text-green-800
圖標顏色: text-green-600
按鈕背景: bg-green-600 hover:bg-green-700
```

#### **紫色主題 (Purple) - 高級功能**
```
背景漸層: from-purple-50 to-violet-50
邊框顏色: border-purple-200
標題文字: text-purple-800
圖標顏色: text-purple-600
```

#### **黃色主題 (Yellow) - 警告/注意**
```
背景漸層: from-yellow-50 to-orange-50
邊框顏色: border-yellow-200
標題文字: text-yellow-800
圖標顏色: text-yellow-600
```

#### **紅色主題 (Red) - 錯誤/危險**
```
背景漸層: from-red-50 to-pink-50
邊框顏色: border-red-200
標題文字: text-red-800
圖標顏色: text-red-600
```

#### **灰色主題 (Gray) - 中性/次要**
```
背景漸層: from-gray-50 to-slate-50
邊框顏色: border-gray-200
標題文字: text-gray-800
圖標顏色: text-gray-600
```

### **顏色使用指南**

#### **功能區分**
- **物料管理**：藍色主題 (主要業務)
- **香精管理**：綠色主題 (產品相關)
- **供應商管理**：紫色主題 (合作夥伴)
- **庫存管理**：黃色主題 (庫存警告)
- **報表分析**：紅色主題 (重要數據)
- **系統設定**：灰色主題 (輔助功能)

#### **狀態指示**
- **成功/完成**：綠色
- **警告/注意**：黃色
- **錯誤/危險**：紅色
- **資訊/中性**：藍色
- **禁用/次要**：灰色

## �� 組件設計規範

### **卡片組件 (Card)**
```css
/* 基礎樣式 */
bg-white
border-2 border-{color}-200
rounded-lg
shadow-md
p-6

/* 主題變體 */
bg-gradient-to-r from-{color}-50 to-{color}-100
```

### **對話框組件 (Dialog)**
```css
/* 容器 */
max-w-2xl max-h-[90vh] overflow-y-auto
bg-white

/* 標題區域 */
pb-4 border-b border-gray-200
bg-gradient-to-r from-{color}-50 to-{color}-100

/* 標題文字 */
text-2xl font-bold text-{color}-800
flex items-center gap-3

/* 圖標容器 */
w-10 h-10 rounded-lg flex items-center justify-center
bg-{color}-100
```

### **按鈕組件 (Button)**
```css
/* 主要按鈕 */
bg-{color}-600 hover:bg-{color}-700
text-white
rounded-md
px-4 py-2
transition-all duration-200

/* 次要按鈕 */
bg-gray-100 hover:bg-gray-200
text-gray-700
border border-gray-300
```

### **表格組件 (Table)**
```css
/* 表頭 */
bg-gray-100 text-gray-800 font-semibold
border-b border-gray-200

/* 表格行 */
hover:bg-gray-50
border-b border-gray-100

/* 單元格 */
p-3 text-sm
```

### **標籤組件 (Badge)**
```css
/* 狀態標籤 */
rounded-full px-2 py-1 text-xs font-medium
bg-{color}-100 text-{color}-700
```

## 📱 響應式設計規範

### **斷點定義**
```css
/* 行動版優先 */
sm: 640px   /* 小螢幕 */
md: 768px   /* 平板 */
lg: 1024px  /* 桌面 */
xl: 1280px  /* 大螢幕 */
2xl: 1536px /* 超大螢幕 */
```

### **佈局策略**
```css
/* 桌面版 */
hidden lg:block
grid-cols-1 lg:grid-cols-2
max-w-4xl

/* 行動版 */
lg:hidden
grid-cols-1
p-4
```

### **字體大小響應**
```css
/* 標題 */
text-lg lg:text-2xl
text-base lg:text-lg

/* 正文 */
text-sm lg:text-base
text-xs lg:text-sm
```

## 🔤 字體與排版

### **字體層級系統**
```css
/* 主標題 */
text-2xl font-bold text-{color}-800

/* 次標題 */
text-lg font-bold text-{color}-800

/* 區塊標題 */
text-base font-semibold text-gray-700

/* 正文 */
text-sm text-gray-600

/* 說明文字 */
text-xs text-gray-500
```

### **行高與間距**
```css
/* 行高 */
leading-tight    /* 緊湊 */
leading-normal   /* 正常 */
leading-relaxed  /* 寬鬆 */

/* 字間距 */
tracking-tight   /* 緊湊 */
tracking-normal  /* 正常 */
tracking-wide    /* 寬鬆 */
```

## 📏 間距系統

### **間距比例**
```css
/* 基礎間距單位 */
space-y-1  /* 4px */
space-y-2  /* 8px */
space-y-3  /* 12px */
space-y-4  /* 16px */
space-y-6  /* 24px */
space-y-8  /* 32px */

/* 內邊距 */
p-1  /* 4px */
p-2  /* 8px */
p-3  /* 12px */
p-4  /* 16px */
p-6  /* 24px */

/* 外邊距 */
m-1  /* 4px */
m-2  /* 8px */
m-3  /* 12px */
m-4  /* 16px */
m-6  /* 24px */
```

### **網格間距**
```css
/* 網格間距 */
gap-2  /* 8px */
gap-4  /* 16px */
gap-6  /* 24px */
gap-8  /* 32px */
```

## 🎭 互動效果

### **過渡動畫**
```css
/* 基礎過渡 */
transition-all duration-200 ease-in-out

/* 快速過渡 */
transition-all duration-150

/* 慢速過渡 */
transition-all duration-300
```

### **懸停效果**
```css
/* 按鈕懸停 */
hover:bg-{color}-700
hover:shadow-lg

/* 卡片懸停 */
hover:shadow-lg
hover:scale-105

/* 連結懸停 */
hover:text-{color}-600
hover:underline
```

### **焦點效果**
```css
/* 輸入框焦點 */
focus:ring-2 focus:ring-{color}-500
focus:border-{color}-500

/* 按鈕焦點 */
focus:outline-none focus:ring-2
focus:ring-{color}-500 focus:ring-offset-2
```

## �� 頁面佈局模板

### **列表頁面模板**
```jsx
// 頁面結構
<PageContainer>
  {/* 頁面標題 */}
  <PageHeader color="blue">
    <Title>頁面標題</Title>
    <ActionButtons />
  </PageHeader>

  {/* 篩選區域 */}
  <FilterSection>
    <SearchInput />
    <FilterTags />
  </FilterSection>

  {/* 主要內容 */}
  <MainContent>
    <Table />
    <Pagination />
  </MainContent>

  {/* 對話框 */}
  <Dialog />
</PageContainer>
```

### **表單頁面模板**
```jsx
// 表單結構
<FormContainer>
  {/* 表單標題 */}
  <FormHeader color="blue">
    <Title>表單標題</Title>
  </FormHeader>

  {/* 表單內容 */}
  <FormContent>
    <FormSection color="blue">
      <SectionTitle>基本資料</SectionTitle>
      <FormFields />
    </FormSection>
    
    <FormSection color="green">
      <SectionTitle>詳細資訊</SectionTitle>
      <FormFields />
    </FormSection>
  </FormContent>

  {/* 表單操作 */}
  <FormActions>
    <CancelButton />
    <SubmitButton />
  </FormActions>
</FormContainer>
```

## 📋 設計檢查清單

### **新頁面開發檢查項目**
- [ ] 使用正確的主題顏色
- [ ] 遵循響應式設計原則
- [ ] 實現一致的間距系統
- [ ] 添加適當的互動效果
- [ ] 確保無障礙設計
- [ ] 測試不同螢幕尺寸
- [ ] 驗證顏色對比度
- [ ] 檢查字體層級
- [ ] 確認組件一致性
- [ ] 測試載入狀態

### **組件設計檢查項目**
- [ ] 使用標準的 Tailwind 類別
- [ ] 實現主題色支援
- [ ] 添加適當的 TypeScript 類型
- [ ] 包含錯誤處理
- [ ] 支援鍵盤導航
- [ ] 提供載入狀態
- [ ] 實現響應式行為
- [ ] 添加適當的 ARIA 標籤

## 🚀 實施指南

### **開發流程**
1. **設計階段**：確定頁面功能和主題色
2. **原型階段**：建立基本的 HTML 結構
3. **樣式階段**：應用 Tailwind CSS 類別
4. **互動階段**：添加 JavaScript 功能
5. **測試階段**：驗證設計一致性
6. **優化階段**：調整細節和性能

### **代碼規範**
- 使用 Tailwind CSS 工具類別
- 遵循 BEM 命名慣例
- 實現 TypeScript 類型安全
- 保持組件可重用性
- 添加適當的註釋

### **品質保證**
- 定期進行設計審查
- 建立組件庫文檔
- 實施自動化測試
- 收集用戶反饋
- 持續改進設計系統

---

**版本**：1.0  
**最後更新**：2024年12月  
**適用範圍**：Deer Lab 全系統  
**維護者**：開發團隊