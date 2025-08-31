// src/types/firebase.ts
/**
 * Firebase 相關類型定義
 */

import { DocumentSnapshot, QuerySnapshot, Timestamp } from 'firebase/firestore';

// ==================== Firebase 文檔類型 ====================

export interface FirebaseDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== Cloud Functions 相關 ====================

export interface CloudFunctionResult<T = any> {
  data: {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  };
}

// 庫存概覽 Cloud Function
export interface InventoryOverviewResponse {
  success: boolean;
  overview?: {
    totalMaterials: number;
    totalFragrances: number;
    totalMaterialCost: number;
    totalFragranceCost: number;
    lowStockMaterials: number;
    lowStockFragrances: number;
    totalLowStock: number;
  };
  error?: string;
}

// 快速更新庫存 Cloud Function
export interface QuickUpdateInventoryPayload {
  itemId: string;
  itemType: 'material' | 'fragrance';
  newStock: number;
  reason?: string;
}

export interface QuickUpdateInventoryResponse {
  success: boolean;
  updatedItem?: {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
  };
  inventoryRecord?: {
    id: string;
    quantityBefore: number;
    quantityAfter: number;
    quantityChanged: number;
  };
  error?: string;
}

// 低庫存項目 Cloud Function
export interface LowStockItem {
  id: string;
  code: string;
  name: string;
  type: 'material' | 'fragrance';
  currentStock: number;
  minStock: number;
  unit: string;
  category?: string;
  supplierName?: string;
  stockRatio: number; // 當前庫存 / 最低庫存比率
}

export interface LowStockItemsResponse {
  success: boolean;
  items?: LowStockItem[];
  summary?: {
    totalItems: number;
    criticalItems: number; // 庫存比率 < 0.5
    lowItems: number; // 庫存比率 < 1.0
  };
  error?: string;
}

// 創建採購單 Cloud Function
export interface CreatePurchaseOrdersPayload {
  suppliers: {
    supplierId: string;
    items: {
      id: string;
      name: string;
      code: string;
      quantity: number;
      unit: string;
      itemRefPath: string; // materials/{id} 或 fragrances/{id}
    }[];
  }[];
}

export interface CreatePurchaseOrdersResponse {
  success: boolean;
  createdOrders?: {
    id: string;
    code: string;
    supplierId: string;
    supplierName: string;
    itemCount: number;
    totalAmount: number;
  }[];
  summary?: {
    totalOrders: number;
    totalItems: number;
    totalAmount: number;
  };
  error?: string;
}

// 全域購物車 Cloud Functions
export interface GlobalCartItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  supplierId: string;
  supplierName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  addedAt: Timestamp;
  addedBy: string;
}

export interface GlobalCartResponse {
  success: boolean;
  items?: GlobalCartItem[];
  totalItems?: number;
  totalAmount?: number;
  error?: string;
}

export interface AddToGlobalCartPayload {
  itemId: string;
  itemType: 'material' | 'fragrance';
  quantity: number;
}

export interface UpdateGlobalCartPayload {
  itemId: string;
  itemType: 'material' | 'fragrance';
  quantity: number;
}

export interface RemoveFromGlobalCartPayload {
  itemId: string;
  itemType: 'material' | 'fragrance';
}

// ==================== Firestore 查詢輔助類型 ====================

export interface PaginationOptions {
  limit?: number;
  startAfter?: DocumentSnapshot;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface QueryResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  total?: number;
}

// ==================== 批量操作類型 ====================

export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T;
  id?: string;
}

export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{
    operation: string;
    error: string;
    data?: any;
  }>;
}

// ==================== 檔案上傳類型 ====================

export interface UploadProgress {
  progress: number; // 0-100
  uploaded: number; // bytes
  total: number; // bytes
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

// ==================== 即時監聽類型 ====================

export type FirestoreListener = () => void;

export interface RealtimeSubscription {
  unsubscribe: FirestoreListener;
  collection: string;
  query?: string;
}

// ==================== 錯誤處理類型 ====================

export interface FirebaseError extends Error {
  code: string;
  message: string;
  name: string;
  details?: any;
}

export interface FirebaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: FirebaseError;
  timestamp: Timestamp;
}