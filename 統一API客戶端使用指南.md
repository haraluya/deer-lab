# 🎯 鹿鹿小作坊 統一 API 客戶端使用指南

## 📋 概述

本指南提供鹿鹿小作坊統一 API 客戶端的完整使用說明，包括所有 Hook 變體、類型安全調用和最佳實踐。

**建立時間**：2025-09-12  
**版本**：1.0.0  
**適用範圍**：前端 React 元件與 Firebase Functions 整合

## 🏗️ 架構概述

### 核心檔案結構
```
src/
├── lib/
│   └── apiClient.ts          # 統一 API 客戶端核心
├── hooks/
│   └── useApiClient.ts       # React Hook 整合
├── types/
│   └── api-interfaces.ts     # API 類型定義
└── components/
    └── StandardFormDialog.tsx # 重構後的表單對話框
```

### 主要特性
- ✅ **類型安全**：100% TypeScript 支援
- 🛡️ **錯誤處理**：統一的錯誤處理機制
- 📊 **載入狀態**：自動載入狀態管理
- 🔄 **重試機制**：自動重試失敗的請求
- 🚦 **併發控制**：智能併發請求管理
- 🎯 **Hook 變體**：針對不同場景的專用 Hook

---

## 🎣 Hook 使用指南

### 1. useApiClient - 通用 API 客戶端

**適用場景**：需要完全控制 API 調用行為的場景

```typescript
import { useApiClient } from '@/hooks/useApiClient';

function MyComponent() {
  const apiClient = useApiClient({
    showSuccessToast: true,
    showErrorToast: true,
    autoResetError: true,
    errorResetDelay: 5000,
  });

  const handleApiCall = async () => {
    const result = await apiClient.call('createMaterial', {
      name: '新材料',
      category: '測試分類',
      unit: 'kg',
    });

    if (result.success) {
      console.log('建立成功:', result.data);
    } else {
      console.error('建立失敗:', result.error);
    }
  };

  return (
    <div>
      <button onClick={handleApiCall} disabled={apiClient.loading}>
        {apiClient.loading ? '建立中...' : '建立材料'}
      </button>
      {apiClient.error && (
        <div className="error">{apiClient.error}</div>
      )}
    </div>
  );
}
```

**可用方法**：
- `call()` - 類型安全的 API 調用
- `callGeneric()` - 通用 API 調用
- `batchCall()` - 批次調用
- `callWithRetry()` - 重試調用

**狀態屬性**：
- `loading` - 載入狀態
- `error` - 錯誤訊息
- `data` - 最後成功的資料
- `stats` - 調用統計

### 2. useApiForm - 表單專用 Hook

**適用場景**：表單提交場景，預設啟用 toast 提示

```typescript
import { useApiForm } from '@/hooks/useApiClient';

function CreateMaterialForm() {
  const apiClient = useApiForm();

  const handleSubmit = async (formData: MaterialData) => {
    const result = await apiClient.call('createMaterial', formData);
    
    if (result.success) {
      // 自動顯示成功 toast
      onSuccess();
    }
    // 錯誤會自動顯示 toast
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={apiClient.loading}>
        {apiClient.loading ? '提交中...' : '提交'}
      </button>
    </form>
  );
}
```

### 3. useApiCrud - CRUD 操作專用 Hook

**適用場景**：標準的 CRUD 操作，提供便利的方法

```typescript
import { useApiCrud } from '@/hooks/useApiClient';

function MaterialManager() {
  const crudClient = useApiCrud();

  const handleCreate = () => crudClient.create('createMaterial', materialData);
  const handleUpdate = () => crudClient.update('updateMaterial', updateData);
  const handleDelete = () => crudClient.delete('deleteMaterial', { id: 'xxx' });
  const handleRead = () => crudClient.read('getMaterials');

  return (
    <div>
      <button onClick={handleCreate}>建立</button>
      <button onClick={handleUpdate}>更新</button>
      <button onClick={handleDelete}>刪除</button>
      <button onClick={handleRead}>讀取</button>
    </div>
  );
}
```

### 4. useApiSilent - 靜默操作 Hook

**適用場景**：背景操作，不需要 toast 提示的場景

```typescript
import { useApiSilent } from '@/hooks/useApiClient';

function BackgroundSync() {
  const silentClient = useApiSilent();

  const syncData = async () => {
    // 靜默調用，無 toast 提示
    const result = await silentClient.call('syncGlobalCart', cartData);
    
    if (result.success) {
      // 手動處理成功邏輯
      updateLocalState(result.data);
    }
  };

  return <button onClick={syncData}>背景同步</button>;
}
```

---

## 🎯 類型安全的 API 調用

### 基本類型安全調用

```typescript
import { useApiClient } from '@/hooks/useApiClient';
import type { MaterialsApi } from '@/types/api-interfaces';

function TypeSafeExample() {
  const apiClient = useApiClient();

  const createMaterial = async () => {
    // 完全類型安全的調用
    const result = await apiClient.call('createMaterial', {
      name: '新材料',        // ✅ 必填
      category: '測試',      // ✅ 必填
      unit: 'kg',           // ✅ 必填
      cost: 100,            // ✅ 可選
      // TypeScript 會自動檢查所有欄位
    });

    if (result.success) {
      // result.data 的類型會自動推導
      console.log('材料 ID:', result.data?.id);
      console.log('生成代碼:', result.data?.generatedCode);
    }
  };

  return <button onClick={createMaterial}>建立材料</button>;
}
```

### 進階類型用法

```typescript
import type { 
  ApiEndpointName, 
  GetApiRequest, 
  GetApiResponse 
} from '@/types/api-interfaces';

// 泛型函數
async function callTypedApi<T extends ApiEndpointName>(
  endpoint: T,
  data: GetApiRequest<T>
): Promise<GetApiResponse<T> | null> {
  const result = await apiClient.call(endpoint, data);
  return result.success ? result.data : null;
}

// 使用範例
const material = await callTypedApi('createMaterial', {
  name: '測試材料',
  category: '測試',
  unit: 'kg',
});
```

---

## 🔄 進階功能

### 批次 API 調用

```typescript
const handleBatchOperation = async () => {
  const results = await apiClient.batchCall([
    { endpoint: 'createMaterial', data: material1Data },
    { endpoint: 'createMaterial', data: material2Data },
    { endpoint: 'createSupplier', data: supplierData },
  ]);

  const successCount = results.filter(r => r.success).length;
  console.log(`${successCount}/${results.length} 操作成功`);
};
```

### 重試機制

```typescript
const handleRetryOperation = async () => {
  const result = await apiClient.callWithRetry('createMaterial', data, {
    maxRetries: 3,       // 最多重試 3 次
    retryDelay: 1000,    // 每次重試間隔 1 秒
    showErrorToast: true // 最後一次失敗才顯示錯誤
  });
};
```

### 併發控制

```typescript
const apiClient = useApiClient({
  maxConcurrentRequests: 5  // 最多同時 5 個請求
});

// 第 6 個請求會等待前面的請求完成
```

---

## 📝 StandardFormDialog 整合

### 基本用法

```typescript
import StandardFormDialog from '@/components/StandardFormDialog';
import { z } from 'zod';

const materialSchema = z.object({
  name: z.string().min(1, '材料名稱必填'),
  category: z.string().min(1, '分類必填'),
  unit: z.string().min(1, '單位必填'),
});

function MaterialDialog() {
  return (
    <StandardFormDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSuccess={() => console.log('建立成功!')}
      title="材料"
      formSchema={materialSchema}
      sections={[/* 表單配置 */]}
      defaultValues={{ name: '', category: '', unit: '' }}
      createFunctionName="createMaterial"  // 自動使用統一 API 客戶端
      updateFunctionName="updateMaterial"
    />
  );
}
```

### 自訂 API 調用

```typescript
const customSubmit = async (values: any, isEditMode: boolean) => {
  // 使用統一 API 客戶端進行自訂調用
  const apiClient = new ApiClient();
  
  const result = await apiClient.call(
    isEditMode ? 'updateMaterial' : 'createMaterial',
    values
  );
  
  if (!result.success) {
    throw new Error(result.error?.message);
  }
  
  return result;
};

<StandardFormDialog
  // ... 其他屬性
  customSubmit={customSubmit}
/>
```

---

## 🛠️ 自訂配置

### API 客戶端配置

```typescript
const apiClient = useApiClient({
  showSuccessToast: false,      // 關閉成功提示
  showErrorToast: true,         // 啟用錯誤提示
  autoResetError: true,         // 自動清除錯誤
  errorResetDelay: 3000,        // 3 秒後清除錯誤
  keepPreviousData: true,       // 保留上次成功資料
  maxConcurrentRequests: 10,    // 併發請求限制
});
```

### 單次調用配置

```typescript
const result = await apiClient.call('createMaterial', data, {
  showLoadingToast: true,
  loadingMessage: '正在建立材料...',
  showSuccessToast: true,
  successMessage: '材料建立成功！',
  showErrorToast: true,
  timeout: 30000,  // 30 秒超時
});
```

---

## 🚨 錯誤處理

### 統一錯誤格式

```typescript
interface ApiError {
  code: string;        // 錯誤代碼
  message: string;     // 用戶友善訊息
  details?: any;       // 詳細錯誤資訊
}
```

### 錯誤處理最佳實踐

```typescript
const handleApiCall = async () => {
  try {
    const result = await apiClient.call('createMaterial', data);
    
    if (result.success) {
      // 處理成功情況
      handleSuccess(result.data);
    } else {
      // 處理 API 錯誤
      switch (result.error?.code) {
        case 'VALIDATION_ERROR':
          handleValidationError(result.error.details);
          break;
        case 'PERMISSION_DENIED':
          handlePermissionError();
          break;
        default:
          handleGenericError(result.error?.message);
      }
    }
  } catch (error) {
    // 處理系統異常
    handleSystemError(error);
  }
};
```

---

## 📊 效能優化

### 載入狀態優化

```typescript
// ✅ 推薦：使用 Hook 的載入狀態
const apiClient = useApiClient();

return (
  <button disabled={apiClient.loading}>
    {apiClient.loading ? '載入中...' : '提交'}
  </button>
);

// ❌ 避免：手動管理載入狀態
const [loading, setLoading] = useState(false);
```

### 併發優化

```typescript
// ✅ 推薦：批次調用
const results = await apiClient.batchCall([...calls]);

// ❌ 避免：逐一調用
for (const call of calls) {
  await apiClient.call(call.endpoint, call.data);
}
```

---

## 🧪 測試

### 單元測試示例

```typescript
import { renderHook, act } from '@testing-library/react';
import { useApiClient } from '@/hooks/useApiClient';

test('API 調用成功處理', async () => {
  const { result } = renderHook(() => useApiClient());
  
  await act(async () => {
    const apiResult = await result.current.call('getRoles');
    expect(apiResult.success).toBe(true);
  });
  
  expect(result.current.stats.successfulCalls).toBe(1);
});
```

### 測試工具

專案提供完整的測試工具：

- **測試頁面**：`/test-api-client`
- **測試元件**：`ApiClientTestTool`
- **表單測試**：`StandardFormDialogTestSuite`

---

## ❓ 常見問題

### Q: 如何處理舊版 API 回應格式？

A: 統一 API 客戶端會自動適配舊版格式：

```typescript
// 舊版格式會自動轉換
{ status: "success", message: "...", materialId: "..." }
// 轉換為
{ success: true, data: { id: "...", message: "..." }, ... }
```

### Q: 如何取消進行中的請求？

A: 使用 `cancelAll()` 方法：

```typescript
const apiClient = useApiClient();

// 取消所有進行中的請求
apiClient.cancelAll();
```

### Q: 如何自訂錯誤處理？

A: 提供自訂錯誤處理函數：

```typescript
const customErrorHandler = (error: any) => {
  // 自訂錯誤處理邏輯
  console.log('自訂錯誤處理:', error);
  showCustomErrorModal(error.message);
};

const result = await apiClient.call('createMaterial', data, {
  customErrorHandler,
  showErrorToast: false,  // 關閉預設錯誤提示
});
```

---

## 📚 參考資源

- **API 介面定義**：`src/types/api-interfaces.ts`
- **Hook 實現**：`src/hooks/useApiClient.ts`
- **核心客戶端**：`src/lib/apiClient.ts`
- **測試工具**：`src/components/ApiClientTestTool.tsx`

---

**最後更新**：2025-09-12  
**版本**：1.0.0