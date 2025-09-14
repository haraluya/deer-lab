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
// 類型定義 - 極簡引用模式
// ============================================================================

interface CartItem {
  id: string;
  type: 'material' | 'fragrance';
  code: string;
  quantity: number;
  addedBy: string;
  addedAt: Date;
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
 * 驗證商品代碼是否存在（輕量驗證，不返回詳細資料）
 */
async function validateItemCode(type: 'material' | 'fragrance', code: string): Promise<boolean> {
  const collection = type === 'material' ? 'materials' : 'fragrances';

  // 只檢查是否存在，不返回資料
  const querySnapshot = await db.collection(collection)
    .where('code', '==', code)
    .limit(1)
    .get();

  return !querySnapshot.empty;
}

// ============================================================================
// API 函數
// ============================================================================

/**
 * 添加項目到購物車 - 極簡引用模式
 */
export const addToGlobalCart = createApiHandler(
  {
    functionName: 'addToGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const { type, code, quantity = 1 } = data;
    const userId = context.auth?.uid || 'anonymous';

    // 驗證參數
    if (!type || !code) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '缺少必要參數: type 或 code'
      );
    }

    if (quantity <= 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '數量必須大於 0'
      );
    }

    if (!['material', 'fragrance'].includes(type)) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '項目類型只能是 material 或 fragrance'
      );
    }

    // 🚀 輕量驗證：只檢查商品代碼是否存在
    const isValidItem = await validateItemCode(type, code);
    if (!isValidItem) {
      throw new BusinessError(
        ApiErrorCode.NOT_FOUND,
        `找不到${type === 'material' ? '原料' : '香精'}代碼: ${code}`
      );
    }

    // 🎯 極簡購物車項目：只存引用
    const cartItem: CartItem = {
      id: `${type}_${code}_${Date.now()}`,
      type: type as 'material' | 'fragrance',
      code,
      quantity,
      addedBy: userId,
      addedAt: new Date()
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
        item => item.type === type && item.code === code
      );

      if (existingItemIndex >= 0) {
        // 更新現有項目的數量
        cartData.items[existingItemIndex].quantity += quantity;
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
    const { itemId, quantity } = data;
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

    // 極簡引用模式：不需要 notes 和 updatedAt 屬性
    // 只保留基本的數量更新

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
 * 批量加入購物車 - 極簡引用模式
 */
export const batchAddToGlobalCart = createApiHandler(
  {
    functionName: 'batchAddToGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
  },
  async (data: any, context, requestId) => {
    const { items } = data;
    const userId = context.auth?.uid || 'anonymous';

    if (!Array.isArray(items) || items.length === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '批量項目不能為空'
      );
    }

    // 🚀 批量處理：使用相同的購物車邏輯
    let successCount = 0;
    const cartRef = db.collection('globalCart').doc('main');

    for (const item of items) {
      try {
        const { type, code, quantity } = item;

        // 驗證項目是否存在
        await validateItemCode(type, code);

        // 讀取當前購物車
        const cartDoc = await cartRef.get();
        let cartData: GlobalCartData;

        if (cartDoc.exists) {
          cartData = cartDoc.data() as GlobalCartData;
        } else {
          cartData = { items: [], lastUpdated: new Date(), lastUpdatedBy: userId };
        }

        // 檢查是否已存在相同項目
        const existingIndex = cartData.items.findIndex(
          existingItem => existingItem.type === type && existingItem.code === code
        );

        if (existingIndex >= 0) {
          // 更新現有項目的數量
          cartData.items[existingIndex].quantity += quantity;
        } else {
          // 建立新項目
          const newCartItem: CartItem = {
            id: `${type}_${code}_${Date.now()}`,
            type,
            code,
            quantity,
            addedBy: userId,
            addedAt: new Date()
          };
          cartData.items.push(newCartItem);
        }

        // 更新購物車
        await cartRef.set({
          ...cartData,
          lastUpdated: new Date(),
          lastUpdatedBy: userId
        });

        successCount++;
      } catch (error) {
        console.warn(`批量加入失敗 - ${item.type}:${item.code}`, error);
        // 繼續處理其他項目，不中斷整個批次
      }
    }

    if (successCount === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '所有項目都加入失敗'
      );
    }

    return {
      message: `成功加入 ${successCount} 個項目`,
      addedCount: successCount,
      totalItems: items.length
    };
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
                   existing.code === item.code
      );

      if (existingIndex >= 0) {
        // 更新現有項目數量（極簡引用模式：不保存 updatedAt）
        currentItems[existingIndex].quantity += item.quantity || 1;
      } else {
        // 添加新項目（極簡引用模式：不包含 updatedAt）
        currentItems.push({
          ...item,
          id: item.id || `${item.type}_${item.code}_${Date.now()}`,
          addedBy: item.addedBy || userId,
          addedAt: item.addedAt || new Date()
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