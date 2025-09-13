// functions/src/api/globalCart.ts
/**
 * 🛒 全域購物車 API
 *
 * 建立時間：2025-09-13
 * 目的：管理全域購物車功能，支援多使用者共同編輯
 */

import { getFirestore } from "firebase-admin/firestore";
import { createApiHandler } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode } from "../utils/errorHandler";

const db = getFirestore();

// ============================================================================
// 類型定義
// ============================================================================

interface CartItem {
  id: string;
  type: 'material' | 'fragrance' | 'product';
  code: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  supplierId: string;
  supplierName: string;
  specs?: string;
  minOrderQuantity?: number;
  notes?: string;
  addedBy: string;
  addedAt: Date;
  updatedAt: Date;
}

interface GlobalCartData {
  items: CartItem[];
  lastUpdated: Date;
  lastUpdatedBy: string;
}

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 獲取或建立購物車文檔
 */
async function getOrCreateCart(): Promise<GlobalCartData> {
  const cartRef = db.collection('globalCart').doc('main');
  const cartDoc = await cartRef.get();

  if (!cartDoc.exists) {
    const initialData: GlobalCartData = {
      items: [],
      lastUpdated: new Date(),
      lastUpdatedBy: 'system'
    };
    await cartRef.set(initialData);
    return initialData;
  }

  return cartDoc.data() as GlobalCartData;
}

/**
 * 根據類型和 ID 獲取項目詳細資訊
 */
async function getItemDetails(type: string, itemId: string): Promise<any> {
  let collection: string;

  switch (type) {
    case 'material':
      collection = 'materials';
      break;
    case 'fragrance':
      collection = 'fragrances';
      break;
    case 'product':
      collection = 'products';
      break;
    default:
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        `不支援的項目類型: ${type}`
      );
  }

  const doc = await db.collection(collection).doc(itemId).get();
  if (!doc.exists) {
    throw new BusinessError(
      ApiErrorCode.NOT_FOUND,
      `找不到 ${type} ID: ${itemId}`
    );
  }

  return { id: doc.id, ...doc.data() };
}

/**
 * 獲取供應商名稱
 */
async function getSupplierName(supplierId: string): Promise<string> {
  if (!supplierId || supplierId === 'none') {
    return '無供應商';
  }

  const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
  if (supplierDoc.exists) {
    return supplierDoc.data()?.name || '未知供應商';
  }

  return '未知供應商';
}

// ============================================================================
// API 函數
// ============================================================================

/**
 * 添加項目到購物車
 */
export const addToGlobalCart = createApiHandler(
  {
    functionName: 'addToGlobalCart',
    requireAuth: false, // 購物車功能允許匿名使用
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const { type, itemId, quantity = 1, supplierId = 'none' } = data;
    const userId = context.auth?.uid || 'anonymous';

    // 驗證參數
    if (!type || !itemId) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '缺少必要參數: type 或 itemId'
      );
    }

    if (quantity <= 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '數量必須大於 0'
      );
    }

    // 獲取項目詳情
    const itemDetails = await getItemDetails(type, itemId);
    const supplierName = await getSupplierName(supplierId);

    // 準備購物車項目
    const cartItem: CartItem = {
      id: `${type}_${itemId}_${supplierId}_${Date.now()}`,
      type: type as 'material' | 'fragrance' | 'product',
      code: itemId,
      name: itemDetails.name || itemDetails.materialName || '未知項目',
      quantity,
      unit: itemDetails.unit || '個',
      price: itemDetails.price || 0,
      supplierId,
      supplierName,
      specs: itemDetails.specs,
      minOrderQuantity: itemDetails.minOrderQuantity,
      notes: itemDetails.notes,
      addedBy: userId,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    // 更新購物車
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      // 建立新購物車
      await cartRef.set({
        items: [cartItem],
        lastUpdated: new Date(),
        lastUpdatedBy: userId
      });
    } else {
      // 更新現有購物車
      const cartData = cartDoc.data() as GlobalCartData;
      const existingItemIndex = cartData.items.findIndex(
        item => item.type === type &&
                item.code === itemId &&
                item.supplierId === supplierId
      );

      if (existingItemIndex >= 0) {
        // 更新現有項目的數量
        cartData.items[existingItemIndex].quantity += quantity;
        cartData.items[existingItemIndex].updatedAt = new Date();
      } else {
        // 添加新項目
        cartData.items.push(cartItem);
      }

      await cartRef.update({
        items: cartData.items,
        lastUpdated: new Date(),
        lastUpdatedBy: userId
      });
    }

    return {
      message: '已加入購物車',
      itemId: cartItem.id
    };
  }
);

/**
 * 更新購物車項目
 */
export const updateGlobalCartItem = createApiHandler(
  {
    functionName: 'updateGlobalCartItem',
    requireAuth: false,
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const { itemId, quantity, notes } = data;
    const userId = context.auth?.uid || 'anonymous';

    if (!itemId) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '缺少必要參數: itemId'
      );
    }

    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      throw new BusinessError(
        ApiErrorCode.NOT_FOUND,
        '購物車不存在'
      );
    }

    const cartData = cartDoc.data() as GlobalCartData;
    const itemIndex = cartData.items.findIndex(item => item.id === itemId);

    if (itemIndex < 0) {
      throw new BusinessError(
        ApiErrorCode.NOT_FOUND,
        '找不到指定的購物車項目'
      );
    }

    // 更新項目
    if (quantity !== undefined) {
      if (quantity <= 0) {
        throw new BusinessError(
          ApiErrorCode.INVALID_INPUT,
          '數量必須大於 0'
        );
      }
      cartData.items[itemIndex].quantity = quantity;
    }

    if (notes !== undefined) {
      cartData.items[itemIndex].notes = notes;
    }

    cartData.items[itemIndex].updatedAt = new Date();

    await cartRef.update({
      items: cartData.items,
      lastUpdated: new Date(),
      lastUpdatedBy: userId
    });

    return { message: '購物車項目已更新' };
  }
);

/**
 * 從購物車移除項目
 */
export const removeFromGlobalCart = createApiHandler(
  {
    functionName: 'removeFromGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const { itemId } = data;
    const userId = context.auth?.uid || 'anonymous';

    if (!itemId) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '缺少必要參數: itemId'
      );
    }

    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      throw new BusinessError(
        ApiErrorCode.NOT_FOUND,
        '購物車不存在'
      );
    }

    const cartData = cartDoc.data() as GlobalCartData;
    const filteredItems = cartData.items.filter(item => item.id !== itemId);

    if (filteredItems.length === cartData.items.length) {
      throw new BusinessError(
        ApiErrorCode.NOT_FOUND,
        '找不到指定的購物車項目'
      );
    }

    await cartRef.update({
      items: filteredItems,
      lastUpdated: new Date(),
      lastUpdatedBy: userId
    });

    return { message: '已從購物車移除' };
  }
);

/**
 * 清空購物車
 */
export const clearGlobalCart = createApiHandler(
  {
    functionName: 'clearGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const userId = context.auth?.uid || 'anonymous';

    const cartRef = db.collection('globalCart').doc('main');
    await cartRef.set({
      items: [],
      lastUpdated: new Date(),
      lastUpdatedBy: userId
    });

    return { message: '購物車已清空' };
  }
);

/**
 * 同步購物車（用於從 localStorage 遷移）
 */
export const syncGlobalCart = createApiHandler(
  {
    functionName: 'syncGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const { items } = data;
    const userId = context.auth?.uid || 'anonymous';

    if (!items || !Array.isArray(items)) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '缺少必要參數: items'
      );
    }

    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();

    let currentItems: CartItem[] = [];
    if (cartDoc.exists) {
      const cartData = cartDoc.data() as GlobalCartData;
      currentItems = cartData.items || [];
    }

    // 合併項目
    for (const item of items) {
      const existingIndex = currentItems.findIndex(
        existing => existing.type === item.type &&
                   existing.code === item.code &&
                   existing.supplierId === item.supplierId
      );

      if (existingIndex >= 0) {
        // 更新現有項目
        currentItems[existingIndex].quantity += item.quantity || 1;
        currentItems[existingIndex].updatedAt = new Date();
      } else {
        // 添加新項目
        currentItems.push({
          ...item,
          id: item.id || `${item.type}_${item.code}_${Date.now()}`,
          addedBy: item.addedBy || userId,
          addedAt: item.addedAt || new Date(),
          updatedAt: new Date()
        });
      }
    }

    await cartRef.set({
      items: currentItems,
      lastUpdated: new Date(),
      lastUpdatedBy: userId
    });

    return {
      message: '購物車已同步',
      itemCount: currentItems.length
    };
  }
);