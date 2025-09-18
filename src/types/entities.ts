// src/types/entities.ts
/**
 * 統一的實體類型定義檔案
 * 整合所有核心業務實體的類型定義，避免重複定義
 */

import { Timestamp } from 'firebase/firestore';

// ==================== 基礎實體類型 ====================

/**
 * 所有實體的基礎介面
 * 包含通用的元數據欄位
 */
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
  isActive: boolean;
}

/**
 * 庫存項目基礎介面
 * 所有庫存相關實體的共用屬性
 */
export interface InventoryItem extends BaseEntity {
  code: string;
  name: string;
  currentStock: number;
  unit: string;
  costPerUnit: number;
  minStock: number;
  maxStock: number;
  category?: string;
  supplierId?: string;
  supplierName?: string;
}

// ==================== 核心實體定義 ====================

/**
 * 原料實體
 * 繼承庫存項目基礎屬性
 */
export interface Material extends InventoryItem {
  // 原料特有屬性
  subCategory?: string;
  mainCategoryId?: string;
  subCategoryId?: string;
  safetyStockLevel?: number;
}

/**
 * 香精實體
 * 繼承庫存項目基礎屬性，增加香精特有功能
 */
export interface Fragrance extends InventoryItem {
  // 香精特有屬性
  series?: string;
  status: '啟用' | '備用' | '棄用';
  usedInProducts?: string[];
  usageCount?: number;
  lastUsedAt?: Timestamp;
}

/**
 * 產品實體
 */
export interface Product extends BaseEntity {
  code: string;
  name: string;
  seriesId?: string;
  seriesName?: string;
  category?: string;
  targetQuantity: number;
  unit: string;
  description?: string;
  
  // 配方相關
  recipe?: ProductRecipe;
  billOfMaterials?: BillOfMaterialsItem[];
}

/**
 * 產品系列實體
 */
export interface ProductSeries extends BaseEntity {
  code: string;
  name: string;
  description?: string;
}

/**
 * 供應商實體
 */
export interface Supplier extends BaseEntity {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  products: string[];
}

/**
 * 人員實體
 */
export interface Personnel extends BaseEntity {
  employeeId: string;
  name: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  
  // 統計資訊
  stats?: {
    totalTimeEntries: number;
    totalWorkHours: number;
    avgHoursPerEntry: number;
    lastActiveDate?: string;
  };
}

// ==================== 配方和BOM相關類型 ====================

/**
 * 產品配方
 */
export interface ProductRecipe {
  pgRatio: number;
  vgRatio: number;
  nicotineStrength: number;
  fragranceRatio: number;
  fragrances: RecipeFragrance[];
}

/**
 * 配方中的香精
 */
export interface RecipeFragrance {
  id: string;
  name: string;
  ratio: number;
}

/**
 * 物料清單項目
 */
export interface BillOfMaterialsItem {
  id: string;
  code: string;
  name: string;
  type: 'material' | 'fragrance';
  requiredQuantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  currentStock: number;
  category?: string;
  supplierId?: string;
  supplierName?: string;
  
  // 向後相容的舊屬性
  materialId?: string;
  materialName?: string;
  materialCode?: string;
  quantity?: number;
  ratio?: number;
  isCalculated?: boolean;
  usedQuantity?: number;
}

// ==================== 購物車和採購相關類型 ====================

/**
 * 極簡購物車項目定義 - 只存引用
 */
export interface CartItem {
  id: string;
  type: 'material' | 'fragrance';
  code: string;
  quantity: number;
  addedBy: string;
  addedAt: any; // Date or Timestamp
}

/**
 * 採購訂單
 */
export interface PurchaseOrder extends BaseEntity {
  code: string;
  supplierId: string;
  supplierName: string;
  status: '預報單' | '已訂購' | '已收貨' | '已取消';
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  createdByName: string;
  
  // 訂單處理日期
  orderedAt?: Timestamp;
  receivedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

/**
 * 採購訂單項目
 */
export interface PurchaseOrderItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  itemRefPath: string;
  
  // 收貨資訊
  receivedQuantity?: number;
  receivedAt?: Timestamp;
}

// ==================== 工單和工時相關類型 ====================

/**
 * 工單實體
 */
export interface WorkOrder extends BaseEntity {
  code: string;
  productSnapshot: {
    id: string;
    name: string;
    code: string;
    seriesName?: string;
    recipe?: ProductRecipe;
  };
  targetQuantity: number;
  unit: string;
  status: '預報' | '進行' | '完工' | '入庫';
  
  // BOM 表和庫存管理
  billOfMaterials: BillOfMaterialsItem[];
  completedAt?: Timestamp;
  warehousedAt?: Timestamp;
  
  // 圖片和留言
  images?: string[];
  comments?: WorkOrderComment[];
  
  // 工時記錄統一使用 timeEntries 集合，不再使用內嵌陣列
  
  // 元數據
  createdByName: string;
}

/**
 * 工單留言
 */
export interface WorkOrderComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  images?: string[];
}

/**
 * 工時記錄（新版）
 */
export interface TimeEntry {
  id: string;
  workOrderId: string;
  workOrderCode?: string;
  workOrderNumber?: string;
  productName?: string;
  personnelId: string;
  personnelName: string;
  workDate: string; // YYYY-MM-DD 格式
  startDate: string; // YYYY-MM-DD 格式
  startTime: string; // HH:MM 格式
  endDate: string; // YYYY-MM-DD 格式
  endTime: string; // HH:MM 格式
  duration: number; // 小時數 (例如: 8.5)
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // 結算相關欄位
  isSettled?: boolean;        // 是否已結算
  settledAt?: Timestamp;       // 結算時間
  settledBy?: string;          // 結算人員ID
  settledByName?: string;      // 結算人員姓名
  settlementBatch?: string;    // 結算批次號
}

// 已移除 LegacyTimeRecord，統一使用 TimeEntry

/**
 * 人員工時統計
 */
export interface PersonnelTimeStats {
  totalHours: number;
  overtimeHours: number;
  workDays: number;
  avgHoursPerDay: number;
  completedWorkOrders: number;
  monthlyEntries: TimeEntry[];
}

// ==================== 庫存記錄類型 ====================

/**
 * 庫存記錄
 */
export interface InventoryRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'material' | 'fragrance';
  action: 'direct_modification' | 'purchase_received' | 'production_consumed' | 'adjustment';
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  unit: string;
  reason?: string;
  notes?: string;
  
  // 關聯記錄
  relatedOrderId?: string;
  relatedOrderCode?: string;
  
  // 操作者資訊
  operatorId: string;
  operatorName: string;
  createdAt: Timestamp;
}

// ==================== 統計和概覽類型 ====================

/**
 * 庫存概覽統計
 */
export interface InventoryOverview {
  totalMaterials: number;
  totalFragrances: number;
  totalMaterialCost: number;
  totalFragranceCost: number;
  lowStockMaterials: number;
  lowStockFragrances: number;
  totalLowStock: number;
}

/**
 * 通用庫存項目（用於統一顯示）
 */
export interface InventoryItemDisplay {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  category?: string;
  series?: string;
  type: 'material' | 'fragrance';
}

// ==================== 香精歷史管理類型 ====================

/**
 * 香精更換歷史
 */
export interface FragranceChangeHistory {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  oldFragranceId: string;
  oldFragranceName: string;
  oldFragranceCode: string;
  newFragranceId: string;
  newFragranceName: string;
  newFragranceCode: string;
  changeReason: string;
  changeDate: Timestamp;
  changedBy: string;
  changedByName: string;
  createdAt: Timestamp;
}

/**
 * 香精更換歷史查詢參數
 */
export interface FragranceChangeHistoryQuery {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  productId?: string;
  fragranceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * 香精更換歷史查詢結果
 */
export interface FragranceChangeHistoryResult {
  data: FragranceChangeHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 香精狀態更新參數
 */
export interface FragranceStatusUpdateParams {
  newFragranceId: string;
  oldFragranceId?: string;
  action: 'add' | 'remove' | 'change';
  productId?: string;
}

// ==================== 類型聯合和工具類型 ====================

/**
 * 所有核心實體的聯合類型
 */
export type CoreEntity = Material | Fragrance | Product | ProductSeries | Supplier | Personnel;

/**
 * 所有庫存實體的聯合類型
 */
export type InventoryEntity = Material | Fragrance;

/**
 * 實體類型字符串
 */
export type EntityType = 'material' | 'fragrance' | 'product' | 'supplier' | 'personnel';

/**
 * 通用的實體資料類型（包含 Firestore 文檔資料）
 */
export type EntityData<T extends BaseEntity = BaseEntity> = T & {
  [key: string]: any;
};

// ==================== 向下相容類型別名 ====================

/**
 * 向下相容的類型別名
 * 確保現有代碼在遷移期間不會中斷
 */

// Material 相關別名
export type MaterialData = Material & EntityData & {
  // 擴展屬性以支援現有組件
  supplierRef?: any;
  notes?: string;
};
export type MaterialWithSupplier = Material & { supplierName: string };

// Fragrance 相關別名
export type FragranceData = Fragrance & EntityData;
export type FragranceWithSupplier = Fragrance & { supplierName: string };

// Product 相關別名
export type ProductData = Product & EntityData;
export type ProductWithDetails = Product & { seriesName?: string };

// Supplier 相關別名
export type SupplierData = Supplier & EntityData;
export type SupplierWithLiaison = Supplier & { contactPerson: string };

// CartItem 相關別名（保持與現有代碼相容）
export type GlobalCartItem = CartItem;
export type PurchaseCartItem = CartItem;