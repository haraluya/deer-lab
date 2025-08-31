// src/types/api.ts
/**
 * API 請求和響應相關類型定義
 */

// ==================== 通用 API 類型 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== HTTP 方法和配置 ====================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface RequestOptions {
  cache?: boolean;
  cacheTime?: number; // minutes
  retries?: number;
  timeout?: number;
  showLoading?: boolean;
  showError?: boolean;
}

// ==================== 快取相關類型 ====================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

export interface CacheConfig {
  defaultTTL: number; // minutes
  maxSize: number; // entries
  enableCompression: boolean;
  enablePersistence: boolean;
}

// ==================== 庫存相關 API ====================

export interface InventoryAPI {
  getOverview: () => Promise<ApiResponse<any>>;
  getItems: (type: 'material' | 'fragrance', options?: RequestOptions) => Promise<ApiResponse<any[]>>;
  updateStock: (payload: {
    itemId: string;
    itemType: 'material' | 'fragrance';
    newStock: number;
    reason?: string;
  }) => Promise<ApiResponse<any>>;
  getLowStockItems: () => Promise<ApiResponse<any[]>>;
}

// ==================== 採購相關 API ====================

export interface PurchaseAPI {
  getOrders: (options?: RequestOptions) => Promise<ApiResponse<any[]>>;
  getOrder: (id: string) => Promise<ApiResponse<any>>;
  createOrders: (payload: any) => Promise<ApiResponse<any>>;
  updateOrder: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteOrder: (id: string) => Promise<ApiResponse<void>>;
  
  // 全域購物車
  getGlobalCart: () => Promise<ApiResponse<any>>;
  addToGlobalCart: (payload: any) => Promise<ApiResponse<any>>;
  updateCartItem: (payload: any) => Promise<ApiResponse<any>>;
  removeFromCart: (payload: any) => Promise<ApiResponse<void>>;
  clearCart: () => Promise<ApiResponse<void>>;
}

// ==================== 工單相關 API ====================

export interface WorkOrderAPI {
  getOrders: (options?: RequestOptions) => Promise<ApiResponse<any[]>>;
  getOrder: (id: string) => Promise<ApiResponse<any>>;
  createOrder: (data: any) => Promise<ApiResponse<any>>;
  updateOrder: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteOrder: (id: string) => Promise<ApiResponse<void>>;
  completeOrder: (id: string) => Promise<ApiResponse<any>>;
  warehouseOrder: (id: string) => Promise<ApiResponse<any>>;
}

// ==================== 工時相關 API ====================

export interface TimeTrackingAPI {
  getTimeEntries: (workOrderId: string) => Promise<ApiResponse<any[]>>;
  createTimeEntry: (data: any) => Promise<ApiResponse<any>>;
  updateTimeEntry: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteTimeEntry: (id: string) => Promise<ApiResponse<void>>;
  getPersonalStats: (personnelId: string, month?: string) => Promise<ApiResponse<any>>;
  getCompanyStats: (month?: string) => Promise<ApiResponse<any>>;
}

// ==================== 人員相關 API ====================

export interface PersonnelAPI {
  getPersonnel: () => Promise<ApiResponse<any[]>>;
  getPerson: (id: string) => Promise<ApiResponse<any>>;
  createPerson: (data: any) => Promise<ApiResponse<any>>;
  updatePerson: (id: string, data: any) => Promise<ApiResponse<any>>;
  deletePerson: (id: string) => Promise<ApiResponse<void>>;
}

// ==================== 產品相關 API ====================

export interface ProductAPI {
  getProducts: () => Promise<ApiResponse<any[]>>;
  getProduct: (id: string) => Promise<ApiResponse<any>>;
  createProduct: (data: any) => Promise<ApiResponse<any>>;
  updateProduct: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteProduct: (id: string) => Promise<ApiResponse<void>>;
  
  getSeries: () => Promise<ApiResponse<any[]>>;
  createSeries: (data: any) => Promise<ApiResponse<any>>;
}

// ==================== 供應商相關 API ====================

export interface SupplierAPI {
  getSuppliers: () => Promise<ApiResponse<any[]>>;
  getSupplier: (id: string) => Promise<ApiResponse<any>>;
  createSupplier: (data: any) => Promise<ApiResponse<any>>;
  updateSupplier: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteSupplier: (id: string) => Promise<ApiResponse<void>>;
}

// ==================== 檔案上傳 API ====================

export interface FileUploadAPI {
  uploadImage: (file: File, path: string) => Promise<ApiResponse<{
    url: string;
    path: string;
    size: number;
  }>>;
  deleteFile: (path: string) => Promise<ApiResponse<void>>;
  getUploadUrl: (filename: string, contentType: string) => Promise<ApiResponse<{
    uploadUrl: string;
    downloadUrl: string;
  }>>;
}

// ==================== 報表相關 API ====================

export interface ReportAPI {
  getInventoryReport: (dateRange?: { start: string; end: string }) => Promise<ApiResponse<any>>;
  getPurchaseReport: (dateRange?: { start: string; end: string }) => Promise<ApiResponse<any>>;
  getProductionReport: (dateRange?: { start: string; end: string }) => Promise<ApiResponse<any>>;
  getTimeReport: (dateRange?: { start: string; end: string }, personnelId?: string) => Promise<ApiResponse<any>>;
  exportReport: (type: string, format: 'csv' | 'excel' | 'pdf', params: any) => Promise<Blob>;
}

// ==================== WebSocket 相關類型 ====================

export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  id: string;
}

export interface RealtimeUpdate {
  collection: string;
  documentId: string;
  action: 'created' | 'updated' | 'deleted';
  data?: any;
  timestamp: number;
}

// ==================== 搜索相關 API ====================

export interface SearchAPI {
  globalSearch: (query: string, filters?: {
    collections?: string[];
    limit?: number;
  }) => Promise<ApiResponse<{
    results: Array<{
      id: string;
      title: string;
      description: string;
      type: string;
      url: string;
      score: number;
    }>;
    total: number;
    took: number;
  }>>;
  
  searchMaterials: (query: string) => Promise<ApiResponse<any[]>>;
  searchFragrances: (query: string) => Promise<ApiResponse<any[]>>;
  searchProducts: (query: string) => Promise<ApiResponse<any[]>>;
  searchSuppliers: (query: string) => Promise<ApiResponse<any[]>>;
}

// ==================== 批量操作 API ====================

export interface BatchAPI {
  batchUpdate: <T>(updates: Array<{
    collection: string;
    id: string;
    data: Partial<T>;
  }>) => Promise<ApiResponse<{
    success: number;
    failed: number;
    errors: string[];
  }>>;
  
  batchDelete: (deletions: Array<{
    collection: string;
    id: string;
  }>) => Promise<ApiResponse<{
    success: number;
    failed: number;
    errors: string[];
  }>>;
  
  batchCreate: <T>(creations: Array<{
    collection: string;
    data: T;
  }>) => Promise<ApiResponse<{
    success: number;
    failed: number;
    created: Array<{ id: string; data: T }>;
    errors: string[];
  }>>;
}