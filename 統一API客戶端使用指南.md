# 🎯 鹿鹿小作坊 統一 API 客戶端使用指南

## 📋 概述

本指南提供鹿鹿小作坊統一 API 客戶端的完整使用說明，包括所有 Hook 變體、類型安全調用和最佳實踐。

**建立時間**：2025-09-12  
**最後更新**：2025-09-13  
**版本**：1.1.0  
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
- ✅ **類型安全**：82個API端點完整TypeScript支援
- 🛡️ **錯誤處理**：統一的錯誤處理機制與格式轉換
- 📊 **載入狀態**：自動載入狀態管理
- 🔄 **重試機制**：自動重試失敗的請求
- 🚦 **併發控制**：智能併發請求管理
- 🎯 **Hook 變體**：4種不同場景的專用Hook
- 🔧 **自動適配**：無縫適配舊版API回應格式
- ⚡ **效能優化**：React Hook依賴優化完成

### 🩺 健康狀態 (2025-09-13更新)

**架構健康評分：90/100** ⬆️ (從85分提升)

✅ **已完成優化項目**：
- 修復13個React Hook Dependencies警告 → 剩餘9個非關鍵警告
- 統一16個檔案的API調用方式，從`callGeneric`遷移至類型安全的`call`方法
- 優化useGlobalCart Hook的API客戶端依賴問題
- 改善錯誤處理機制的一致性（狀態轉換、格式適配）

✅ **建構狀態**：
- 無編譯錯誤 ✅
- 類型安全大幅提升 ✅  
- 所有核心功能正常運作 ✅

🔄 **持續改進中**：
- 3個複雜API調用結構需進一步分析（ProductDialog、採購相關）
- 9個Hook依賴警告（非關鍵，不影響功能）

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

### 常見錯誤處理場景

```typescript
// 1. API不存在錯誤處理（v1.2.0新增）
const handleApiNotFound = async () => {
  const result = await apiClient.call('someDisabledFunction', data);

  if (!result.success && result.error?.code === 'API_NOT_FOUND') {
    // 優雅處理API暫時停用的情況
    toast.info('此功能暫時不可用，請稍後再試');
    return null;
  }
};

// 2. 權限錯誤處理（v1.2.0增強）
const handlePermissionDenied = async () => {
  const result = await apiClient.call('restrictedFunction', data);

  if (!result.success) {
    switch (result.error?.code) {
      case 'PERMISSION_DENIED':
        toast.error('您沒有權限執行此操作');
        break;
      case 'UNAUTHENTICATED':
        toast.error('請先登入後再試');
        // 可以跳轉到登入頁面
        break;
      case 'TIMEOUT':
        toast.error('請求超時，請稍後再試');
        break;
      default:
        toast.error(result.error?.message || '操作失敗');
    }
  }
};

// 3. 狀態轉換處理（購買訂單）
const updateStatus = async (newStatus: string) => {
  // 自動轉換中文狀態為API期望的英文狀態
  const statusMap = {
    '預報單': 'pending',
    '已訂購': 'ordered',
    '已收貨': 'received',
    '已取消': 'cancelled'
  };

  const result = await apiClient.call('updatePurchaseOrderStatus', {
    id: orderId,
    status: statusMap[newStatus] || newStatus
  });
};

// 4. 複雜資料結構轉換（庫存統計）
const loadOverview = async () => {
  const result = await apiClient.call('getInventoryOverview');

  if (result.success && result.data) {
    // 轉換API回應格式為本地介面格式
    const localOverview = {
      totalMaterials: result.data.materials.totalItems,
      totalFragrances: result.data.fragrances.totalItems,
      totalMaterialCost: result.data.materials.totalValue,
      totalFragranceCost: result.data.fragrances.totalValue,
      lowStockMaterials: result.data.materials.lowStockCount,
      lowStockFragrances: result.data.fragrances.lowStockCount,
      totalLowStock: result.data.materials.lowStockCount + result.data.fragrances.lowStockCount
    };
    setOverview(localOverview);
  }
};

// 5. 批次操作處理（快速更新庫存）
const quickUpdate = async (item: any, newStock: number) => {
  const result = await apiClient.call('quickUpdateInventory', {
    updates: [{
      type: item.type,
      itemId: item.id,
      newStock: newStock,
      reason: `快速更新${item.type === 'material' ? '物料' : '香精'}庫存`
    }]
  });
};
```

---

## 🔄 遷移指南

### 從 callGeneric 遷移到 call

**已成功遷移的檔案（16個）**：
```typescript
// ❌ 舊版寫法
const result = await apiClient.callGeneric('createMaterial', data);

// ✅ 新版寫法 - 完全類型安全
const result = await apiClient.call('createMaterial', {
  name: '材料名稱',      // 類型檢查
  category: '分類',      // 必填欄位驗證
  unit: 'kg',           // 自動完成
});
```

**成功遷移的API端點**：
- `getInventoryOverview`, `quickUpdateInventory`, `getLowStockItems`
- `createPersonnel`, `updatePersonnel`, `deletePersonnel`, `setUserStatus`  
- `getRoles`, `initializeDefaultRoles`
- `updatePurchaseOrderStatus`

**暫時保留 callGeneric 的複雜案例**：
```typescript
// 複雜產品資料結構（需進一步分析）
const result = await apiClient.callGeneric('createProduct', payload);

// 複雜採購訂單結構（需進一步分析）
const result = await apiClient.callGeneric('createPurchaseOrders', payload);
const result = await apiClient.callGeneric('receivePurchaseOrderItems', payload);
```

### React Hook Dependencies 優化

**已修復的問題**：
```typescript
// ❌ 舊版 - 缺少依賴
const loadData = async () => { /* API調用 */ };
useEffect(() => { loadData(); }, []);

// ✅ 新版 - 正確依賴
const loadData = useCallback(async () => { 
  /* API調用 */ 
}, [apiClient]);
useEffect(() => { loadData(); }, [loadData]);
```

**修復的檔案**：
- `LowStockDialog.tsx` - useCallback包裝
- `MaterialCategoryDialog.tsx` - useCallback包裝
- `useGlobalCart.ts` - 5個useCallback依賴修復

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

**最後更新**：2025-09-13  
**版本**：1.1.0

---

## 📝 更新日誌

### v1.2.0 (2025-09-13) - 緊急修復版本
- 🚨 **緊急API修復**：修復工時統計頁面API調用錯誤
- 🛠️ **錯誤處理增強**：新增Firebase Functions特殊錯誤處理機制
- 🔧 **API重建**：重新建立工時記錄API (`getPersonalValidTimeRecords`, `cleanupInvalidTimeRecords`)
- 📋 **錯誤分類**：增加API_NOT_FOUND、PERMISSION_DENIED、TIMEOUT等錯誤類型處理
- ✅ **問題解決**：修復因暫停Functions導致的前端錯誤

### v1.1.0 (2025-09-13)
- ✅ **健康檢查完成**：架構健康評分提升至90/100
- ✅ **API調用優化**：16個檔案成功遷移至類型安全的call方法
- ✅ **Hook依賴修復**：修復13個React Hook Dependencies警告
- ✅ **錯誤處理改善**：新增狀態轉換和格式適配最佳實踐
- 📚 **文檔更新**：新增遷移指南和實際使用案例
- 🎯 **建構狀態**：無編譯錯誤，類型安全大幅提升

### v1.0.0 (2025-09-12)  
- 🎉 **初版發布**：統一API客戶端架構建立
- 📊 **類型定義**：82個API端點完整類型支援
- 🎣 **Hook系統**：4種不同場景的專用Hook
- 🛠️ **測試工具**：完整的測試頁面和元件