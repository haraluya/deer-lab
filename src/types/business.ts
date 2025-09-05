// src/types/business.ts
/**
 * 業務邏輯相關類型定義
 */

import { Timestamp } from 'firebase/firestore';

// ==================== 基礎材料和產品 ====================

export interface Material {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  category?: string;
  supplierId?: string;
  supplierName?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Fragrance {
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
  supplierId?: string;
  supplierName?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  seriesId?: string;
  seriesName?: string;
  category?: string;
  targetQuantity: number;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 配方相關
  recipe?: ProductRecipe;
  billOfMaterials?: BillOfMaterialsItem[];
}

export interface ProductSeries {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== 配方和BOM ====================

export interface ProductRecipe {
  pgRatio: number;
  vgRatio: number;
  nicotineStrength: number;
  fragranceRatio: number;
  fragrances: RecipeFragrance[];
}

export interface RecipeFragrance {
  id: string;
  name: string;
  ratio: number;
}

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

// ==================== 供應商 ====================

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  products: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== 採購管理 ====================

export interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  status: '預報單' | '已訂購' | '已收貨' | '已取消';
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 訂單處理日期
  orderedAt?: Timestamp;
  receivedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

export interface PurchaseOrderItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  itemRefPath: string; // Firebase 文檔引用路徑
  
  // 收貨資訊
  receivedQuantity?: number;
  receivedAt?: Timestamp;
}

// 採購車項目
export interface CartItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  supplierId: string;
  supplierName: string;
  unit: string;
  quantity: number;
  costPerUnit?: number; // 改為可選，以與 useGlobalCart 相容
  price?: number; // 新增以支援全域購物車
  currentStock: number;
  // 新增用途和分類欄位
  category?: string;
  subcategory?: string;
  series?: string;
  usedInProducts?: string[];
}

// ==================== 工單管理 ====================

export interface WorkOrder {
  id: string;
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
  
  // 工時記錄 (舊版本相容)
  timeRecords?: LegacyTimeRecord[];
  
  // 元數據
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkOrderComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  images?: string[];
}

// 舊版工時記錄格式 (向後相容)
export interface LegacyTimeRecord {
  id: string;
  personnelId: string;
  personnelName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  duration: number; // 分鐘
  createdAt: Timestamp;
}

// ==================== 工時管理 ====================

export interface TimeEntry {
  id: string;
  workOrderId: string;
  workOrderCode?: string;
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
}

export interface PersonnelTimeStats {
  totalHours: number;
  overtimeHours: number;
  workDays: number;
  avgHoursPerDay: number;
  completedWorkOrders: number;
  monthlyEntries: TimeEntry[];
}

// ==================== 人員管理 ====================

export interface Personnel {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 統計資訊
  stats?: {
    totalTimeEntries: number;
    totalWorkHours: number;
    avgHoursPerEntry: number;
    lastActiveDate?: string;
  };
}

// ==================== 庫存記錄 ====================

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
  relatedOrderId?: string; // 採購單或工單ID
  relatedOrderCode?: string;
  
  // 操作者資訊
  operatorId: string;
  operatorName: string;
  createdAt: Timestamp;
}

// ==================== 庫存統計 ====================

export interface InventoryOverview {
  totalMaterials: number;
  totalFragrances: number;
  totalMaterialCost: number;
  totalFragranceCost: number;
  lowStockMaterials: number;
  lowStockFragrances: number;
  totalLowStock: number;
}

export interface InventoryItem {
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