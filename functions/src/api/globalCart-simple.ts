// functions/src/api/globalCart-simple.ts
/**
 * 🛒 簡化版購物車 API - 用於測試
 */

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 簡化版加入購物車
 */
export const testAddToGlobalCart = onCall(async (request) => {
  console.log('testAddToGlobalCart 被調用，接收到的資料:', request.data);

  try {
    const { type, itemId, quantity = 1, supplierId = 'none' } = request.data;
    const userId = request.auth?.uid || 'anonymous';

    console.log('解析參數:', { type, itemId, quantity, supplierId, userId });

    // 驗證參數
    if (!type || !itemId) {
      console.error('參數驗證失敗: 缺少 type 或 itemId');
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '缺少必要參數: type 或 itemId'
        },
        meta: {
          timestamp: Date.now(),
          requestId: `test_${Date.now()}`,
          version: '1.0.0'
        }
      };
    }

    // 根據類型獲取真實的項目詳情
    let itemDetails: any = {};
    let supplierName = '未知供應商';

    try {
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
          throw new Error(`不支援的項目類型: ${type}`);
      }

      // 先嘗試用 itemId 作為文檔 ID 查詢
      let doc = await db.collection(collection).doc(itemId).get();

      if (doc.exists) {
        itemDetails = { id: doc.id, ...doc.data() };
        console.log('通過文檔 ID 獲取到的項目詳情:', itemDetails);
      } else {
        // 如果找不到，則用 code 欄位查詢
        console.log(`文檔 ID ${itemId} 不存在，嘗試用 code 欄位查詢`);
        const querySnapshot = await db.collection(collection)
          .where('code', '==', itemId)
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          itemDetails = { id: docData.id, ...docData.data() };
          console.log('通過 code 欄位獲取到的項目詳情:', itemDetails);
        } else {
          console.warn(`找不到 ${type} code: ${itemId}`);
        }
      }

      // 獲取供應商名稱
      if (supplierId && supplierId !== 'none') {
        const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
        if (supplierDoc.exists) {
          supplierName = supplierDoc.data()?.name || '未知供應商';
        }
      } else {
        supplierName = '無供應商';
      }

    } catch (error) {
      console.error('獲取項目詳情時發生錯誤:', error);
    }

    // 準備購物車項目 - 先複製原始資料，再覆蓋特定欄位
    const cartItem = {
      // 包含原始資料的所有欄位，以便採購單頁面正確顯示
      ...itemDetails,
      // 覆蓋或設定購物車特定欄位
      id: `${type}_${itemId}_${supplierId}_${Date.now()}`,
      type,
      code: itemId,
      name: itemDetails.name || itemDetails.materialName || itemDetails.fragranceName || `項目_${itemId}`,
      quantity,
      unit: itemDetails.unit || '個',
      price: itemDetails.price || itemDetails.costPerUnit || 0,
      supplierId,
      supplierName,
      specs: itemDetails.specs,
      minOrderQuantity: itemDetails.minOrderQuantity,
      notes: itemDetails.notes,
      addedBy: userId,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    console.log('準備寫入 Firestore 的資料:', cartItem);

    // 寫入 Firestore
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      console.log('購物車不存在，建立新的');
      await cartRef.set({
        items: [cartItem],
        lastUpdated: new Date(),
        lastUpdatedBy: userId
      });
    } else {
      console.log('購物車已存在，添加項目');
      const cartData = cartDoc.data();
      const currentItems = cartData?.items || [];
      currentItems.push(cartItem);

      await cartRef.update({
        items: currentItems,
        lastUpdated: new Date(),
        lastUpdatedBy: userId
      });
    }

    console.log('成功寫入購物車');

    return {
      success: true,
      data: {
        message: '已加入購物車',
        itemId: cartItem.id
      },
      meta: {
        timestamp: Date.now(),
        requestId: `test_${Date.now()}`,
        version: '1.0.0'
      }
    };

  } catch (error: any) {
    console.error('testAddToGlobalCart 發生錯誤:', error);

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '系統發生內部錯誤'
      },
      meta: {
        timestamp: Date.now(),
        requestId: `test_error_${Date.now()}`,
        version: '1.0.0'
      }
    };
  }
});