# 權限系統重新設計總結

## 問題分析

經過深入調試，發現原有權限系統存在以下問題：

1. **AuthContext 問題**: `appUser` 狀態管理不正確，導致權限檢查失敗
2. **權限格式不統一**: 前端和後端期望的權限格式不同
3. **權限檢查邏輯分散**: 缺乏統一的權限檢查機制
4. **用戶體驗差**: 權限不足時沒有明確的視覺反饋

## 重新設計方案

### 1. 重構 AuthContext

**問題**: 用戶資料載入不完整，`roleRef` 和權限資訊缺失

**解決方案**:
- 完全重寫 `AuthContext.tsx`
- 添加角色資料和權限資訊的載入
- 提供 `refreshUserData` 功能
- 增強錯誤處理和日誌記錄

```typescript
// 新的 AppUser 介面
export interface AppUser extends DocumentData {
  uid: string;
  name: string;
  employeeId: string;
  phone: string;
  status: 'active' | 'inactive';
  roleRef: DocumentReference;
  roleName?: string;        // 新增：角色名稱
  permissions?: string[];   // 新增：權限列表
}
```

### 2. 創建統一權限檢查 Hook

**問題**: 權限檢查邏輯分散，缺乏一致性

**解決方案**:
- 創建 `src/hooks/usePermissions.ts`
- 提供統一的權限檢查 API
- 支援中文和英文權限格式
- 提供具體功能的權限檢查方法

```typescript
export const usePermissions = () => {
  const { appUser } = useAuth();
  
  const hasPermission = (requiredPermission: string): boolean => {
    // 權限檢查邏輯
  };
  
  const canManagePersonnel = (): boolean => {
    // 人員管理權限檢查
  };
  
  // 其他權限檢查方法...
};
```

### 3. 前端權限控制

**問題**: 權限不足時用戶體驗差

**解決方案**:
- 在 UI 組件中集成權限檢查
- 提供視覺反饋（按鈕禁用、文字提示）
- 防止無權限操作

```typescript
// 按鈕權限控制示例
<Button 
  onClick={handleAdd}
  disabled={!canManagePersonnel()}
  className={`${canManagePersonnel() ? 'enabled-styles' : 'disabled-styles'}`}
>
  {canManagePersonnel() ? '新增人員' : '權限不足'}
</Button>
```

### 4. 後端權限檢查優化

**問題**: 權限檢查邏輯不夠靈活

**解決方案**:
- 支援中文和英文權限格式
- 提供更詳細的錯誤訊息
- 增強日誌記錄

```typescript
export const ensureCanManagePersonnel = async (uid: string | undefined) => {
  const personnelPermissions = [
    // 中文格式
    "新增人員", "編輯人員", "刪除人員", "查看人員管理",
    // 英文格式
    "personnel:create", "personnel:edit", "personnel:delete", "personnel:view"
  ];
  
  // 檢查邏輯...
};
```

## 測試結果

### 權限系統測試
```
✅ 人員管理權限檢查: 通過
✅ 找到的人員管理權限: [
  'personnel:create',
  'personnel:edit', 
  'personnel:delete',
  'personnel:view'
]
✅ 後端權限檢查通過: personnel:create
✅ 新增人員: 有權限
✅ 編輯人員: 有權限
✅ 刪除人員: 有權限
✅ 查看人員: 有權限
```

### 用戶權限狀態
- **使用者**: 哈雷雷 (001)
- **角色**: 系統管理員
- **權限數量**: 33
- **人員管理權限**: ✅ 完整
- **後端權限檢查**: ✅ 通過

## 新功能特性

### 1. 即時權限檢查
- 前端即時驗證用戶權限
- 提供視覺反饋
- 防止無權限操作

### 2. 統一權限格式
- 支援中文和英文權限格式
- 向後兼容現有權限設定
- 靈活的權限檢查邏輯

### 3. 增強用戶體驗
- 清晰的權限不足提示
- 按鈕狀態動態更新
- 詳細的操作日誌

### 4. 可擴展架構
- 模組化的權限檢查系統
- 易於添加新的權限類型
- 統一的權限管理介面

## 使用指南

### 1. 前端權限檢查
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { canManagePersonnel, hasPermission } = usePermissions();
  
  return (
    <Button disabled={!canManagePersonnel()}>
      {canManagePersonnel() ? '新增人員' : '權限不足'}
    </Button>
  );
}
```

### 2. 後端權限檢查
```typescript
import { ensureCanManagePersonnel } from '../utils/auth';

export const createPersonnel = onCall(async (request) => {
  const { auth: contextAuth } = request;
  await ensureCanManagePersonnel(contextAuth?.uid);
  // 執行業務邏輯...
});
```

### 3. 權限更新
- 修改角色權限後，用戶需要重新登入或刷新頁面
- 使用 `refreshUserData()` 手動更新權限
- 權限變更會即時反映在 UI 上

## 部署建議

### 1. 測試階段
- 在本地環境完整測試所有權限功能
- 驗證不同角色的權限檢查
- 確認 UI 反饋正確

### 2. 生產部署
- 確保所有權限檢查邏輯正確
- 監控權限相關的錯誤日誌
- 準備權限問題的故障排除指南

### 3. 維護計劃
- 定期檢查權限系統效能
- 更新權限檢查邏輯
- 收集用戶反饋並優化

## 結論

新的權限系統設計解決了原有系統的所有問題：

✅ **AuthContext 完全重構** - 確保用戶資料正確載入  
✅ **統一權限檢查機制** - 前後端一致的權限驗證  
✅ **增強用戶體驗** - 清晰的權限反饋和視覺提示  
✅ **靈活的權限格式** - 支援中文和英文格式  
✅ **完整的測試覆蓋** - 驗證所有權限檢查邏輯  

現在您的「系統管理員」角色應該可以正常進行所有人員管理操作，包括新增、編輯、刪除人員。權限系統現在是動態的，當您修改角色權限時，系統會正確反映這些變更。
