// functions/src/api/globalCart.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

// 購物車項目介面
interface CartItem {
  id: string;
  type: 'material' | 'fragrance';
  code: string;
  name: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  currentStock: number;
  price?: number;
  notes?: string;
  addedBy: string;
  addedAt: Timestamp;
  updatedAt: Timestamp;
}

// 獲取全域購物車
export const getGlobalCart = onCall(async (request) => {
  try {
    // 獲取全域購物車文檔
    const cartDoc = await db.collection("globalCart").doc("main").get();
    
    if (!cartDoc.exists) {
      // 如果不存在，建立一個空的購物車
      await db.collection("globalCart").doc("main").set({
        items: [],
        lastUpdated: FieldValue.serverTimestamp(),
        updatedBy: request.auth?.uid || 'system'
      });
      return { items: [] };
    }
    
    const cartData = cartDoc.data();
    return { items: cartData?.items || [] };
  } catch (error) {
    console.error("獲取全域購物車失敗:", error);
    throw new HttpsError("internal", "獲取購物車失敗");
  }
});

// 添加項目到購物車
export const addToGlobalCart = onCall(async (request) => {
  const { item } = request.data;
  
  if (!item) {
    throw new HttpsError("invalid-argument", "缺少購物車項目資料");
  }
  
  try {
    const cartRef = db.collection("globalCart").doc("main");
    const cartDoc = await cartRef.get();
    
    // 準備新項目
    const newItem: CartItem = {
      ...item,
      id: item.id || `${item.type}_${item.code}_${Date.now()}`,
      addedBy: request.auth?.uid || 'anonymous',
      addedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    if (!cartDoc.exists) {
      // 建立新購物車
      await cartRef.set({
        items: [newItem],
        lastUpdated: FieldValue.serverTimestamp(),
        updatedBy: request.auth?.uid || 'system'
      });
    } else {
      // 更新現有購物車
      const currentItems = cartDoc.data()?.items || [];
      
      // 檢查是否已存在相同項目
      const existingIndex = currentItems.findIndex(
        (i: CartItem) => i.type === newItem.type && i.code === newItem.code && i.supplierId === newItem.supplierId
      );
      
      if (existingIndex >= 0) {
        // 更新數量
        currentItems[existingIndex].quantity += newItem.quantity;
        currentItems[existingIndex].updatedAt = Timestamp.now();
      } else {
        // 添加新項目
        currentItems.push(newItem);
      }
      
      await cartRef.update({
        items: currentItems,
        lastUpdated: FieldValue.serverTimestamp(),
        updatedBy: request.auth?.uid || 'system'
      });
    }
    
    return { success: true, message: "已加入購物車" };
  } catch (error) {
    console.error("添加到購物車失敗:", error);
    throw new HttpsError("internal", "添加到購物車失敗");
  }
});

// 更新購物車項目
export const updateGlobalCartItem = onCall(async (request) => {
  const { itemId, updates } = request.data;
  
  if (!itemId || !updates) {
    throw new HttpsError("invalid-argument", "缺少項目 ID 或更新資料");
  }
  
  try {
    const cartRef = db.collection("globalCart").doc("main");
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      throw new HttpsError("not-found", "購物車不存在");
    }
    
    const currentItems = cartDoc.data()?.items || [];
    const itemIndex = currentItems.findIndex((i: CartItem) => i.id === itemId);
    
    if (itemIndex === -1) {
      throw new HttpsError("not-found", "找不到指定的購物車項目");
    }
    
    // 更新項目
    currentItems[itemIndex] = {
      ...currentItems[itemIndex],
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await cartRef.update({
      items: currentItems,
      lastUpdated: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid || 'system'
    });
    
    return { success: true, message: "購物車項目已更新" };
  } catch (error) {
    console.error("更新購物車項目失敗:", error);
    throw new HttpsError("internal", "更新購物車項目失敗");
  }
});

// 從購物車移除項目
export const removeFromGlobalCart = onCall(async (request) => {
  const { itemId } = request.data;
  
  if (!itemId) {
    throw new HttpsError("invalid-argument", "缺少項目 ID");
  }
  
  try {
    const cartRef = db.collection("globalCart").doc("main");
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      throw new HttpsError("not-found", "購物車不存在");
    }
    
    const currentItems = cartDoc.data()?.items || [];
    const filteredItems = currentItems.filter((i: CartItem) => i.id !== itemId);
    
    if (filteredItems.length === currentItems.length) {
      throw new HttpsError("not-found", "找不到指定的購物車項目");
    }
    
    await cartRef.update({
      items: filteredItems,
      lastUpdated: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid || 'system'
    });
    
    return { success: true, message: "已從購物車移除" };
  } catch (error) {
    console.error("從購物車移除失敗:", error);
    throw new HttpsError("internal", "從購物車移除失敗");
  }
});

// 清空購物車
export const clearGlobalCart = onCall(async (request) => {
  try {
    const cartRef = db.collection("globalCart").doc("main");
    
    await cartRef.set({
      items: [],
      lastUpdated: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid || 'system'
    });
    
    return { success: true, message: "購物車已清空" };
  } catch (error) {
    console.error("清空購物車失敗:", error);
    throw new HttpsError("internal", "清空購物車失敗");
  }
});

// 僅以代碼新增項目到購物車（會自動查詢完整資料）
export const addToGlobalCartByCode = onCall(async (request) => {
  const { code, type, quantity } = request.data;
  
  if (!code || !type || !quantity) {
    throw new HttpsError("invalid-argument", "缺少必要參數：code, type, quantity");
  }
  
  if (!['material', 'fragrance'].includes(type)) {
    throw new HttpsError("invalid-argument", "type 必須是 'material' 或 'fragrance'");
  }
  
  try {
    // 根據類型和代碼查詢完整資料
    let itemDoc;
    let collection: string;
    
    if (type === 'material') {
      collection = 'materials';
      const materialsQuery = await db.collection('materials').where('code', '==', code).limit(1).get();
      if (materialsQuery.empty) {
        throw new HttpsError("not-found", `找不到代碼為 ${code} 的原料`);
      }
      itemDoc = materialsQuery.docs[0];
    } else {
      collection = 'fragrances';
      const fragrancesQuery = await db.collection('fragrances').where('code', '==', code).limit(1).get();
      if (fragrancesQuery.empty) {
        throw new HttpsError("not-found", `找不到代碼為 ${code} 的香精`);
      }
      itemDoc = fragrancesQuery.docs[0];
    }
    
    const itemData = itemDoc.data();
    
    // 取得供應商資訊
    let supplierName = '未指定供應商';
    if (itemData.supplierRef?.id) {
      const supplierDoc = await db.collection('suppliers').doc(itemData.supplierRef.id).get();
      if (supplierDoc.exists) {
        supplierName = supplierDoc.data()?.name || '未指定供應商';
      }
    }
    
    // 建構完整的購物車項目
    const fullItem: CartItem = {
      id: `${type}_${code}_${Date.now()}`,
      type: type as 'material' | 'fragrance',
      code: itemData.code,
      name: itemData.name,
      supplierId: itemData.supplierRef?.id || '',
      supplierName: supplierName,
      quantity: quantity,
      unit: itemData.unit || 'KG',
      currentStock: itemData.currentStock || 0,
      price: itemData.costPerUnit || 0,
      addedBy: request.auth?.uid || 'anonymous',
      addedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    // 使用現有的 addToGlobalCart 邏輯
    const cartRef = db.collection("globalCart").doc("main");
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      // 建立新購物車
      await cartRef.set({
        items: [fullItem],
        lastUpdated: FieldValue.serverTimestamp(),
        updatedBy: request.auth?.uid || 'system'
      });
    } else {
      // 更新現有購物車
      const currentItems = cartDoc.data()?.items || [];
      
      // 檢查是否已存在相同項目
      const existingIndex = currentItems.findIndex(
        (i: CartItem) => i.type === fullItem.type && i.code === fullItem.code && i.supplierId === fullItem.supplierId
      );
      
      if (existingIndex >= 0) {
        // 更新數量
        currentItems[existingIndex].quantity += fullItem.quantity;
        currentItems[existingIndex].updatedAt = Timestamp.now();
      } else {
        // 添加新項目
        currentItems.push(fullItem);
      }
      
      await cartRef.update({
        items: currentItems,
        lastUpdated: FieldValue.serverTimestamp(),
        updatedBy: request.auth?.uid || 'system'
      });
    }
    
    return { success: true, message: "已加入購物車", item: fullItem };
  } catch (error) {
    console.error("依代碼添加到購物車失敗:", error);
    throw new HttpsError("internal", `添加到購物車失敗: ${error.message}`);
  }
});

// 批量更新購物車（用於從 localStorage 遷移）
export const syncGlobalCart = onCall(async (request) => {
  const { items } = request.data;
  
  if (!Array.isArray(items)) {
    throw new HttpsError("invalid-argument", "項目必須是陣列");
  }
  
  try {
    const cartRef = db.collection("globalCart").doc("main");
    
    // 處理所有項目，添加必要的元數據
    const processedItems = items.map(item => ({
      ...item,
      id: item.id || `${item.type}_${item.code}_${Date.now()}`,
      addedBy: item.addedBy || request.auth?.uid || 'anonymous',
      addedAt: item.addedAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    }));
    
    await cartRef.set({
      items: processedItems,
      lastUpdated: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid || 'system'
    });
    
    return { success: true, message: "購物車已同步", itemCount: processedItems.length };
  } catch (error) {
    console.error("同步購物車失敗:", error);
    throw new HttpsError("internal", "同步購物車失敗");
  }
});