// src/types/api-interfaces.ts
/**
 * 🎯 鹿鹿小作坊 API 介面類型定義
 * 
 * 建立時間：2025-09-12
 * 目的：為所有 Firebase Functions API 提供類型安全支援
 */

// =============================================================================
// 共用類型
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: number;
    requestId: string;
    version: string;
  };
}

export interface CrudResponse {
  id: string;
  message: string;
  operation: 'created' | 'updated' | 'deleted';
  resource?: {
    type: string;
    name?: string;
    code?: string;
  };
}

export interface BatchOperationResult<T = any> {
  successful: T[];
  failed: {
    item: T;
    error: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

// =============================================================================
// 原料管理 (Materials) API
// =============================================================================

export namespace MaterialsApi {
  export interface CreateRequest {
    code?: string;
    name: string;
    category: string;
    subCategory?: string;
    supplierName?: string;
    supplierId?: string;
    unit: string;
    cost?: number;
    stock?: number;
    minStock?: number;
    description?: string;
    tags?: string[];
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }

  export interface ImportRequest {
    materials: CreateRequest[];
  }

  export interface CreateResponse extends CrudResponse {
    generatedCode: string;
  }

  export interface UpdateResponse extends CrudResponse {
    updatedCode: string;
  }
}

// =============================================================================
// 香精管理 (Fragrances) API  
// =============================================================================

export namespace FragrancesApi {
  export interface CreateRequest {
    code: string;
    name: string;
    category: string;
    subCategory?: string;
    supplierName?: string;
    supplierId?: string;
    unit: string;
    cost?: number;
    stock?: number;
    minStock?: number;
    description?: string;
    tags?: string[];
    // 香精專用欄位
    fragranceType?: string;
    fragranceStatus?: string;
    percentage?: number;
    pgRatio?: number;
    vgRatio?: number;
    remarks?: string;
    currentStock?: number;
    costPerUnit?: number;
    safetyStockLevel?: number;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    fragranceId: string;
  }

  export interface UpdateByCodeRequest extends Partial<CreateRequest> {
    code: string;
  }

  export interface DeleteRequest {
    id: string;
  }

  export interface DiagnoseStatusResponse {
    issues: {
      fragranceId: string;
      fragranceName: string;
      issue: string;
      severity: 'warning' | 'error';
    }[];
    summary: {
      totalFragrances: number;
      issuesFound: number;
      warningsCount: number;
      errorsCount: number;
    };
  }

  export interface FixStatusResponse extends BatchOperationResult {
    fixedIssues: string[];
  }

  export interface DiagnoseRatiosResponse {
    issues: {
      productId: string;
      productName: string;
      fragranceRatios: any[];
      totalRatio: number;
      issue: string;
    }[];
    summary: {
      totalProducts: number;
      issuesFound: number;
    };
  }

  export interface FixAllRatiosResponse extends BatchOperationResult {
    fixedProducts: string[];
  }
}

// =============================================================================
// 供應商管理 (Suppliers) API
// =============================================================================

export namespace SuppliersApi {
  export interface CreateRequest {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    notes?: string;
    isActive?: boolean;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }
}

// =============================================================================
// 產品管理 (Products) API
// =============================================================================

export namespace ProductsApi {
  export interface CreateRequest {
    code?: string;
    name: string;
    category: string;
    type: string;
    description?: string;
    fragrances?: {
      fragranceId: string;
      fragranceName?: string;
      ratio: number;
    }[];
    materials?: {
      materialId: string;
      materialName?: string;
      quantity: number;
    }[];
    tags?: string[];
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }

  export interface CreateResponse extends CrudResponse {
    generatedCode: string;
  }

  export interface UpdateFragranceStatusesRequest {
    productId: string;
    fragrances: {
      fragranceId: string;
      status: string;
    }[];
  }

  export interface BatchUpdateFragranceStatusesRequest {
    products: {
      productId: string;
      fragrances: {
        fragranceId: string;
        status: string;
      }[];
    }[];
  }

  export interface ChangeProductFragranceRequest {
    productId: string;
    oldFragranceId: string;
    newFragranceId: string;
    ratio: number;
    reason: string;
  }

  export interface GetFragranceChangeHistoryRequest {
    productId?: string;
    fragranceId?: string;
    limit?: number;
  }

  export interface GetProductFragranceHistoryRequest {
    productId: string;
  }
}

// =============================================================================
// 工單管理 (Work Orders) API
// =============================================================================

export namespace WorkOrdersApi {
  export interface CreateRequest {
    productId: string;
    quantity: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    dueDate?: string;
    notes?: string;
    assignedTo?: string;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }

  export interface AddTimeRecordRequest {
    workOrderId: string;
    userId: string;
    hours: number;
    description?: string;
    date?: string;
  }

  export interface CompleteWorkOrderRequest {
    workOrderId: string;
    actualQuantity: number;
    notes?: string;
  }
}

// =============================================================================
// 採購管理 (Purchase Orders) API
// =============================================================================

export namespace PurchaseOrdersApi {
  export interface CreateRequest {
    items: {
      type: 'material' | 'fragrance';
      itemId: string;
      quantity: number;
      cost?: number;
    }[];
    supplierId?: string;
    notes?: string;
    expectedDeliveryDate?: string;
  }

  export interface UpdateStatusRequest {
    id: string;
    status: 'pending' | 'ordered' | 'shipped' | 'received' | 'cancelled';
    notes?: string;
  }

  export interface ReceiveItemsRequest {
    id: string;
    receivedItems: {
      itemId: string;
      receivedQuantity: number;
      actualCost?: number;
      notes?: string;
    }[];
    receivedDate?: string;
    notes?: string;
  }
}

// =============================================================================
// 庫存管理 (Inventory) API
// =============================================================================

export namespace InventoryApi {
  export interface AdjustRequest {
    type: 'material' | 'fragrance';
    itemId: string;
    quantity: number;
    adjustmentType: 'add' | 'subtract' | 'set';
    reason: string;
    notes?: string;
  }

  export interface QuickUpdateRequest {
    updates: {
      type: 'material' | 'fragrance';
      itemId: string;
      newStock: number;
      reason?: string;
    }[];
  }

  export interface GetOverviewRequest {
    includeFragrances?: boolean;
    includeMaterials?: boolean;
  }

  export interface GetLowStockRequest {
    type?: 'material' | 'fragrance';
    threshold?: number;
  }

  export interface PerformStocktakeRequest {
    items: {
      type: 'material' | 'fragrance';
      itemId: string;
      actualStock: number;
    }[];
    notes?: string;
  }

  export interface OverviewResponse {
    materials: {
      totalItems: number;
      totalValue: number;
      lowStockCount: number;
    };
    fragrances: {
      totalItems: number;
      totalValue: number;
      lowStockCount: number;
    };
  }

  export interface LowStockResponse {
    items: {
      id: string;
      name: string;
      code: string;
      type: 'material' | 'fragrance';
      currentStock: number;
      minStock: number;
      shortage: number;
    }[];
  }

  export interface StocktakeResponse extends BatchOperationResult {
    adjustments: {
      type: 'material' | 'fragrance';
      itemId: string;
      itemName: string;
      oldStock: number;
      newStock: number;
      difference: number;
    }[];
  }
}

// =============================================================================
// 人員管理 (Personnel) API
// =============================================================================

export namespace PersonnelApi {
  export interface CreateRequest {
    name: string;
    employeeId: string;
    email?: string;
    phone?: string;
    role: string;
    department?: string;
    position?: string;
    hireDate?: string;
    salary?: number;
    notes?: string;
    isActive?: boolean;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }
}

// =============================================================================
// 用戶管理 (Users) API
// =============================================================================

export namespace UsersApi {
  export interface CreateRequest {
    name: string;
    email: string;
    password: string;
    employeeId?: string;
    role?: string;
  }

  export interface UpdateRequest {
    uid: string;
    name?: string;
    email?: string;
    employeeId?: string;
    role?: string;
  }

  export interface SetStatusRequest {
    uid: string;
    isActive: boolean;
    reason?: string;
  }
}

// =============================================================================
// 角色權限 (Roles) API
// =============================================================================

export namespace RolesApi {
  export interface CreateRequest {
    name: string;
    description?: string;
    permissions: string[];
    level: number;
    isActive?: boolean;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }

  export interface CheckUsageRequest {
    roleId: string;
  }

  export interface GetRoleRequest {
    roleId: string;
  }

  export interface AssignUserRoleRequest {
    uid: string;
    roleId: string;
    reason?: string;
  }

  export interface CheckUsageResponse {
    isInUse: boolean;
    userCount: number;
    users: {
      uid: string;
      name: string;
      email: string;
    }[];
  }

  export interface GetRolesResponse {
    roles: {
      id: string;
      name: string;
      description?: string;
      permissions: string[];
      level: number;
      isActive: boolean;
      userCount: number;
    }[];
  }

  export interface GetRoleResponse {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    level: number;
    isActive: boolean;
    users: {
      uid: string;
      name: string;
      email: string;
    }[];
  }
}

// =============================================================================
// 認證授權 (Auth) API
// =============================================================================

export namespace AuthApi {
  export interface LoginRequest {
    employeeId: string;
    password: string;
  }

  export interface VerifyPasswordRequest {
    uid: string;
    password: string;
  }

  export interface LoginResponse {
    success: boolean;
    user: {
      uid: string;
      name: string;
      email: string;
      employeeId: string;
      role: string;
    };
    token: string;
  }

  export interface VerifyPasswordResponse {
    isValid: boolean;
    user?: {
      uid: string;
      name: string;
      email: string;
    };
  }
}

// =============================================================================
// 工時記錄 (Time Records) API
// =============================================================================

export namespace TimeRecordsApi {
  export interface CleanupRequest {
    daysToKeep?: number;
    dryRun?: boolean;
  }

  export interface GetPersonalRecordsRequest {
    userId: string;
    startDate?: string;
    endDate?: string;
    workOrderId?: string;
  }

  export interface CleanupResponse {
    deletedCount: number;
    affectedWorkOrders: string[];
    summary: {
      totalRecordsChecked: number;
      invalidRecordsFound: number;
      recordsDeleted: number;
    };
  }

  export interface GetPersonalRecordsResponse {
    records: {
      id: string;
      workOrderId: string;
      userId: string;
      hours: number;
      description?: string;
      date: string;
      createdAt: string;
    }[];
    summary: {
      totalRecords: number;
      totalHours: number;
      uniqueWorkOrders: number;
    };
  }
}

// =============================================================================
// 全域購物車 (Global Cart) API
// =============================================================================

export namespace GlobalCartApi {
  export interface GetCartRequest {
    // 無參數
  }

  export interface AddItemRequest {
    type: 'material' | 'fragrance';
    itemId: string;
    quantity: number;
    supplierId?: string;
  }

  export interface UpdateItemRequest {
    itemId: string;
    quantity?: number;
    supplierId?: string;
  }

  export interface RemoveItemRequest {
    itemId: string;
  }

  export interface ClearCartRequest {
    // 無參數
  }

  export interface AddByCodeRequest {
    code: string;
    quantity: number;
  }

  export interface SyncCartRequest {
    items: {
      type: 'material' | 'fragrance';
      itemId: string;
      quantity: number;
      supplierId?: string;
    }[];
    clearExisting?: boolean;
  }

  export interface CartItem {
    id: string;
    type: 'material' | 'fragrance';
    itemId: string;
    itemName: string;
    itemCode: string;
    quantity: number;
    supplierName?: string;
    supplierId?: string;
    cost?: number;
    totalCost?: number;
  }

  export interface GetCartResponse {
    items: CartItem[];
    summary: {
      totalItems: number;
      totalQuantity: number;
      totalCost: number;
      supplierCount: number;
    };
  }

  export interface SyncCartResponse extends BatchOperationResult<CartItem> {
    finalCart: CartItem[];
  }
}

// =============================================================================
// 產品系列 (Product Series) API
// =============================================================================

export namespace ProductSeriesApi {
  export interface CreateRequest {
    name: string;
    description?: string;
    typeCode: string;
    defaultMaterials?: {
      materialId: string;
      quantity: number;
    }[];
    isActive?: boolean;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    id: string;
  }

  export interface DeleteRequest {
    id: string;
  }
}

// =============================================================================
// 權限管理 (Reset Permissions) API
// =============================================================================

export namespace ResetPermissionsApi {
  export interface ResetSystemRequest {
    confirmationCode: string;
    preserveUsers?: boolean;
  }

  export interface GrantAdminRequest {
    uid: string;
    confirmationCode: string;
  }

  export interface ResetSystemResponse {
    rolesCleared: number;
    usersAffected: number;
    systemReset: boolean;
    preservedUsers: string[];
  }

  export interface GrantAdminResponse {
    userUpdated: boolean;
    adminRoleId: string;
    user: {
      uid: string;
      name: string;
      email: string;
    };
  }
}

// =============================================================================
// 統一 API 函數介面映射
// =============================================================================

export interface ApiEndpoints {
  // 原料管理
  'createMaterial': {
    request: MaterialsApi.CreateRequest;
    response: MaterialsApi.CreateResponse;
  };
  'updateMaterial': {
    request: MaterialsApi.UpdateRequest;
    response: MaterialsApi.UpdateResponse;
  };
  'deleteMaterial': {
    request: MaterialsApi.DeleteRequest;
    response: CrudResponse;
  };
  'importMaterials': {
    request: MaterialsApi.ImportRequest;
    response: BatchOperationResult;
  };

  // 香精管理
  'createFragrance': {
    request: FragrancesApi.CreateRequest;
    response: CrudResponse;
  };
  'updateFragrance': {
    request: FragrancesApi.UpdateRequest;
    response: CrudResponse;
  };
  'updateFragranceByCode': {
    request: FragrancesApi.UpdateByCodeRequest;
    response: CrudResponse;
  };
  'deleteFragrance': {
    request: FragrancesApi.DeleteRequest;
    response: CrudResponse;
  };
  'diagnoseFragranceStatus': {
    request: void;
    response: FragrancesApi.DiagnoseStatusResponse;
  };
  'fixFragranceStatus': {
    request: void;
    response: FragrancesApi.FixStatusResponse;
  };
  'fixAllFragranceRatios': {
    request: void;
    response: FragrancesApi.FixAllRatiosResponse;
  };
  'diagnoseFragranceRatios': {
    request: void;
    response: FragrancesApi.DiagnoseRatiosResponse;
  };

  // 供應商管理
  'createSupplier': {
    request: SuppliersApi.CreateRequest;
    response: CrudResponse;
  };
  'updateSupplier': {
    request: SuppliersApi.UpdateRequest;
    response: CrudResponse;
  };
  'deleteSupplier': {
    request: SuppliersApi.DeleteRequest;
    response: CrudResponse;
  };

  // 產品管理
  'createProduct': {
    request: ProductsApi.CreateRequest;
    response: ProductsApi.CreateResponse;
  };
  'updateProduct': {
    request: ProductsApi.UpdateRequest;
    response: CrudResponse;
  };
  'deleteProduct': {
    request: ProductsApi.DeleteRequest;
    response: CrudResponse;
  };
  'updateFragranceStatusesRealtime': {
    request: ProductsApi.UpdateFragranceStatusesRequest;
    response: any;
  };
  'batchUpdateFragranceStatuses': {
    request: ProductsApi.BatchUpdateFragranceStatusesRequest;
    response: BatchOperationResult;
  };
  'changeProductFragrance': {
    request: ProductsApi.ChangeProductFragranceRequest;
    response: any;
  };
  'getFragranceChangeHistory': {
    request: ProductsApi.GetFragranceChangeHistoryRequest;
    response: any;
  };
  'getProductFragranceHistory': {
    request: ProductsApi.GetProductFragranceHistoryRequest;
    response: any;
  };

  // 工單管理
  'createWorkOrder': {
    request: WorkOrdersApi.CreateRequest;
    response: any;
  };
  'updateWorkOrder': {
    request: WorkOrdersApi.UpdateRequest;
    response: any;
  };
  'deleteWorkOrder': {
    request: WorkOrdersApi.DeleteRequest;
    response: any;
  };
  'addTimeRecord': {
    request: WorkOrdersApi.AddTimeRecordRequest;
    response: any;
  };
  'completeWorkOrder': {
    request: WorkOrdersApi.CompleteWorkOrderRequest;
    response: any;
  };

  // 採購管理
  'createPurchaseOrders': {
    request: PurchaseOrdersApi.CreateRequest;
    response: any;
  };
  'updatePurchaseOrderStatus': {
    request: PurchaseOrdersApi.UpdateStatusRequest;
    response: any;
  };
  'receivePurchaseOrderItems': {
    request: PurchaseOrdersApi.ReceiveItemsRequest;
    response: any;
  };

  // 庫存管理
  'adjustInventory': {
    request: InventoryApi.AdjustRequest;
    response: any;
  };
  'getInventoryOverview': {
    request: InventoryApi.GetOverviewRequest;
    response: InventoryApi.OverviewResponse;
  };
  'quickUpdateInventory': {
    request: InventoryApi.QuickUpdateRequest;
    response: BatchOperationResult;
  };
  'getLowStockItems': {
    request: InventoryApi.GetLowStockRequest;
    response: InventoryApi.LowStockResponse;
  };
  'performStocktake': {
    request: InventoryApi.PerformStocktakeRequest;
    response: InventoryApi.StocktakeResponse;
  };

  // 人員管理
  'createPersonnel': {
    request: PersonnelApi.CreateRequest;
    response: any;
  };
  'updatePersonnel': {
    request: PersonnelApi.UpdateRequest;
    response: any;
  };
  'deletePersonnel': {
    request: PersonnelApi.DeleteRequest;
    response: any;
  };

  // 用戶管理
  'createUser': {
    request: UsersApi.CreateRequest;
    response: CrudResponse;
  };
  'updateUser': {
    request: UsersApi.UpdateRequest;
    response: CrudResponse;
  };
  'setUserStatus': {
    request: UsersApi.SetStatusRequest;
    response: CrudResponse;
  };

  // 角色權限
  'createRole': {
    request: RolesApi.CreateRequest;
    response: CrudResponse;
  };
  'updateRole': {
    request: RolesApi.UpdateRequest;
    response: CrudResponse;
  };
  'deleteRole': {
    request: RolesApi.DeleteRequest;
    response: CrudResponse;
  };
  'checkRoleUsage': {
    request: RolesApi.CheckUsageRequest;
    response: RolesApi.CheckUsageResponse;
  };
  'getRoles': {
    request: void;
    response: RolesApi.GetRolesResponse;
  };
  'getRole': {
    request: RolesApi.GetRoleRequest;
    response: RolesApi.GetRoleResponse;
  };
  'assignUserRole': {
    request: RolesApi.AssignUserRoleRequest;
    response: CrudResponse;
  };
  'initializeDefaultRoles': {
    request: void;
    response: any;
  };

  // 認證授權
  'loginWithEmployeeId': {
    request: AuthApi.LoginRequest;
    response: AuthApi.LoginResponse;
  };
  'verifyPassword': {
    request: AuthApi.VerifyPasswordRequest;
    response: AuthApi.VerifyPasswordResponse;
  };

  // 工時記錄
  'cleanupInvalidTimeRecords': {
    request: TimeRecordsApi.CleanupRequest;
    response: TimeRecordsApi.CleanupResponse;
  };
  'getPersonalValidTimeRecords': {
    request: TimeRecordsApi.GetPersonalRecordsRequest;
    response: TimeRecordsApi.GetPersonalRecordsResponse;
  };

  // 全域購物車
  'getGlobalCart': {
    request: GlobalCartApi.GetCartRequest;
    response: GlobalCartApi.GetCartResponse;
  };
  'addToGlobalCart': {
    request: GlobalCartApi.AddItemRequest;
    response: any;
  };
  'updateGlobalCartItem': {
    request: GlobalCartApi.UpdateItemRequest;
    response: any;
  };
  'removeFromGlobalCart': {
    request: GlobalCartApi.RemoveItemRequest;
    response: any;
  };
  'clearGlobalCart': {
    request: GlobalCartApi.ClearCartRequest;
    response: any;
  };
  'addToGlobalCartByCode': {
    request: GlobalCartApi.AddByCodeRequest;
    response: any;
  };
  'syncGlobalCart': {
    request: GlobalCartApi.SyncCartRequest;
    response: GlobalCartApi.SyncCartResponse;
  };

  // 產品系列
  'createProductSeries': {
    request: ProductSeriesApi.CreateRequest;
    response: CrudResponse;
  };
  'updateProductSeries': {
    request: ProductSeriesApi.UpdateRequest;
    response: CrudResponse;
  };
  'deleteProductSeries': {
    request: ProductSeriesApi.DeleteRequest;
    response: CrudResponse;
  };

  // 權限管理
  'resetPermissionsSystem': {
    request: ResetPermissionsApi.ResetSystemRequest;
    response: ResetPermissionsApi.ResetSystemResponse;
  };
  'grantAdminPermissions': {
    request: ResetPermissionsApi.GrantAdminRequest;
    response: ResetPermissionsApi.GrantAdminResponse;
  };
}

// =============================================================================
// 類型輔助工具
// =============================================================================

/**
 * 從 API 端點名稱獲取請求類型
 */
export type GetApiRequest<T extends keyof ApiEndpoints> = ApiEndpoints[T]['request'];

/**
 * 從 API 端點名稱獲取回應類型
 */
export type GetApiResponse<T extends keyof ApiEndpoints> = ApiEndpoints[T]['response'];

/**
 * 所有可用的 API 端點名稱
 */
export type ApiEndpointName = keyof ApiEndpoints;