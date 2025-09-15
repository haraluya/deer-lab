// functions/src/api/workOrders.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { ensureIsAdminOrForeman } from "../utils/auth";

const db = getFirestore();

interface MaterialInfo {
  id: string;
  name: string;
  code: string;
  type: 'fragrance' | 'material';
  category: 'fragrance' | 'pg' | 'vg' | 'nicotine' | 'specific' | 'common';
  unit: string;
  quantity: number;
  usedQuantity?: number;
  ratio?: number;
  isCalculated: boolean;
}

interface BomItem {
  materialId: string;
  materialType: 'fragrance' | 'material';
  requiredQuantity: number;
  unit: string;
}

/**
 * Creates a new work order based on a product and target quantity with advanced BOM calculation.
 */
export const createWorkOrder = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdminOrForeman(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { productId, targetQuantity, fragranceId, nicotineMg, bomItems } = data;
  if (!productId || typeof targetQuantity !== 'number' || targetQuantity <= 0) {
    throw new HttpsError("invalid-argument", "缺少有效的產品 ID 或目標產量。");
  }

  const createdByRef = db.doc(`users/${contextAuth.uid}`);

  try {
    // 1. Generate a unique work order code
    const today = new Date().toISOString().split('T')[0];
    const counterRef = db.doc(`counters/workOrders_${today}`);
    const newCount = await db.runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      const count = doc.exists ? (doc.data()?.count || 0) + 1 : 1;
      t.set(counterRef, { count }, { merge: true });
      return count;
    });
    const sequence = String(newCount).padStart(3, '0');
    const woCode = `WO-${today.replace(/-/g, "")}-${sequence}`;

    // 2. Fetch product data
    const productRef = db.doc(`products/${productId}`);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的產品。");
    }
    const productData = productSnap.data()!;

    // 3. Fetch fragrance data
    let fragranceData = null;
    let fragranceRef = null;
    if (fragranceId) {
      fragranceRef = db.doc(`fragrances/${fragranceId}`);
      const fragranceSnap = await fragranceRef.get();
      if (fragranceSnap.exists) {
        fragranceData = fragranceSnap.data()!;
      }
    }

    // 如果沒有找到香精資料，嘗試從產品資料中獲取
    if (!fragranceData && productData.fragranceCode) {
      try {
        const fragranceQuery = await db.collection('fragrances')
          .where('code', '==', productData.fragranceCode)
          .limit(1)
          .get();
        
        if (!fragranceQuery.empty) {
          fragranceData = fragranceQuery.docs[0].data();
          fragranceRef = fragranceQuery.docs[0].ref;
        }
      } catch (error) {
        logger.warn(`無法從產品香精代號找到香精資料:`, error);
      }
    }

    // 4. Fetch series data for seriesName
    let seriesName = '未指定';
    if (productData.seriesRef) {
      try {
        const seriesSnap = await productData.seriesRef.get();
        if (seriesSnap.exists) {
          const seriesData = seriesSnap.data()!;
          seriesName = seriesData.name || '未指定';
        }
      } catch (error) {
        logger.warn(`無法載入產品系列資料:`, error);
      }
    }

    // 5. Build Bill of Materials (BOM) from provided bomItems
    const billOfMaterials: MaterialInfo[] = [];

    if (bomItems && Array.isArray(bomItems)) {
      for (const bomItem of bomItems) {
        try {
          const materialRef = db.doc(`${bomItem.materialType === 'fragrance' ? 'fragrances' : 'materials'}/${bomItem.materialId}`);
          const materialSnap = await materialRef.get();
          
          if (materialSnap.exists) {
            const materialData = materialSnap.data()!;
            
            billOfMaterials.push({
              id: bomItem.materialId,
              name: materialData.name,
              code: materialData.code,
              type: bomItem.materialType,
              category: materialData.category || 'common', // 預設為 'common'
              unit: bomItem.unit,
              quantity: bomItem.requiredQuantity,
              ratio: materialData.percentage || materialData.pgRatio || materialData.vgRatio || nicotineMg,
              isCalculated: true,
            });
          }
        } catch (error) {
          logger.warn(`無法載入物料 ${bomItem.materialId}:`, error);
        }
      }
    }

    // 6. Create the work order document
    const workOrderRef = db.collection("workOrders").doc();
    await workOrderRef.set({
      code: woCode,
      productRef: productRef,
      productSnapshot: {
        code: productData.code,
        name: productData.name,
        seriesName: seriesName,
        fragranceName: fragranceData?.name || productData.fragranceName || '未指定',
        fragranceCode: fragranceData?.code || productData.fragranceCode || '未指定',
        nicotineMg: nicotineMg || productData.nicotineMg || 0,
      },
      billOfMaterials: billOfMaterials,
      targetQuantity: targetQuantity,
      actualQuantity: 0,
      status: "未確認",
      qcStatus: "未檢驗",
      createdAt: FieldValue.serverTimestamp(),
      createdByRef: createdByRef,
      notes: "",
      timeRecords: [],
    });
    
    logger.info(`使用者 ${contextAuth.uid} 成功建立了工單 ${woCode} (ID: ${workOrderRef.id})`);
    return { success: true, workOrderId: workOrderRef.id, workOrderCode: woCode };

  } catch (error) {
    logger.error(`建立工單時發生嚴重錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "建立工單時發生未知錯誤。");
  }
});

/**
 * Updates a work order with new data.
 */
export const updateWorkOrder = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdminOrForeman(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { workOrderId, updates } = data;
  if (!workOrderId || !updates) {
    throw new HttpsError("invalid-argument", "缺少工單 ID 或更新資料。");
  }

  try {
    const workOrderRef = db.doc(`workOrders/${workOrderId}`);
    const workOrderSnap = await workOrderRef.get();
    
    if (!workOrderSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的工單。");
    }

    // 只允許更新特定欄位
    const allowedUpdates = {
      status: updates.status,
      qcStatus: updates.qcStatus,
      actualQuantity: updates.actualQuantity,
      targetQuantity: updates.targetQuantity,
      notes: updates.notes,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await workOrderRef.update(allowedUpdates);
    
    logger.info(`使用者 ${contextAuth.uid} 成功更新了工單 ${workOrderId}`);
    return { success: true };

  } catch (error) {
    logger.error(`更新工單時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "更新工單時發生未知錯誤。");
  }
});

/**
 * Adds a time record to a work order.
 * 統一使用 timeEntries 集合，廢除 workOrderTimeRecords
 */
export const addTimeRecord = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdminOrForeman(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { workOrderId, timeRecord } = data;
  if (!workOrderId || !timeRecord) {
    throw new HttpsError("invalid-argument", "缺少工單 ID 或工時紀錄資料。");
  }

  try {
    // 驗證工單存在
    const workOrderRef = db.doc(`workOrders/${workOrderId}`);
    const workOrderSnap = await workOrderRef.get();
    
    if (!workOrderSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的工單。");
    }

    const workOrderData = workOrderSnap.data()!;

    // 驗證人員存在
    const personnelRef = db.doc(`personnel/${timeRecord.personnelId}`);
    const personnelSnap = await personnelRef.get();
    
    if (!personnelSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的人員。");
    }

    const personnelData = personnelSnap.data()!;

    // 計算工時（轉換為小時制）
    const startDateTime = new Date(`${timeRecord.workDate}T${timeRecord.startTime}`);
    const endDateTime = new Date(`${timeRecord.workDate}T${timeRecord.endTime}`);
    
    if (endDateTime <= startDateTime) {
      throw new HttpsError("invalid-argument", "結束時間必須晚於開始時間。");
    }

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const durationHours = diffMs / (1000 * 60 * 60); // 轉為小時制

    // 建立統一的工時記錄（使用 timeEntries 格式）
    const timeEntryData = {
      workOrderId: workOrderId,
      workOrderCode: workOrderData.code,
      workOrderNumber: workOrderData.code,
      productName: workOrderData.productSnapshot?.name || '',
      personnelId: timeRecord.personnelId,
      personnelName: personnelData.name,
      workDate: timeRecord.workDate,
      startDate: timeRecord.workDate,
      startTime: timeRecord.startTime,
      endDate: timeRecord.workDate,
      endTime: timeRecord.endTime,
      duration: durationHours,
      notes: timeRecord.notes || '',
      createdBy: contextAuth.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 儲存到統一的 timeEntries 集合
    const timeEntryRef = await db.collection('timeEntries').add(timeEntryData);
    
    logger.info(`使用者 ${contextAuth.uid} 成功新增工時記錄到工單 ${workOrderId}，使用統一 timeEntries 集合`);
    return { success: true, timeEntryId: timeEntryRef.id };

  } catch (error) {
    logger.error(`新增工時紀錄時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "新增工時紀錄時發生未知錯誤。");
  }
});

/**
 * Deletes a work order and all related time entries.
 */
export const deleteWorkOrder = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  await ensureIsAdminOrForeman(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { workOrderId } = data;
  if (!workOrderId) {
    throw new HttpsError("invalid-argument", "缺少工單 ID。");
  }

  try {
    await db.runTransaction(async (transaction) => {
      // 1. 驗證工單存在
      const workOrderRef = db.doc(`workOrders/${workOrderId}`);
      const workOrderSnap = await transaction.get(workOrderRef);
      
      if (!workOrderSnap.exists) {
        throw new HttpsError("not-found", "找不到指定的工單。");
      }

      const workOrderData = workOrderSnap.data()!;
      
      // 2. 檢查工單狀態 - 只允許刪除未開始或已取消的工單
      if (workOrderData.status === '進行' || workOrderData.status === '完工') {
        throw new HttpsError("failed-precondition", `無法刪除狀態為 "${workOrderData.status}" 的工單。`);
      }

      // 3. 查詢並刪除相關的工時記錄（統一使用 timeEntries）
      const timeEntriesQuery = await db.collection('timeEntries')
        .where('workOrderId', '==', workOrderId)
        .get();

      logger.info(`找到 ${timeEntriesQuery.size} 筆與工單 ${workOrderId} 相關的工時記錄`);

      // 刪除所有工時記錄
      timeEntriesQuery.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // 4. 刪除工單
      transaction.delete(workOrderRef);
      
      logger.info(`已刪除工單 ${workOrderId} 及其相關的 ${timeEntriesQuery.size} 筆工時記錄`);
    });

    logger.info(`使用者 ${contextAuth.uid} 成功刪除工單 ${workOrderId} 及其相關工時記錄`);
    return { 
      success: true, 
      message: `成功刪除工單及其相關工時記錄`,
      deletedTimeEntries: 0 // 實際數量會在 transaction 中計算
    };

  } catch (error) {
    logger.error(`刪除工單時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "刪除工單時發生未知錯誤。");
  }
});

/**
 * Completes a work order and records material consumption.
 */
export const completeWorkOrder = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdminOrForeman(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { workOrderId, actualQuantity, consumedMaterials } = data;
  if (!workOrderId || typeof actualQuantity !== 'number' || actualQuantity < 0) {
    throw new HttpsError("invalid-argument", "缺少工單 ID 或實際產量。");
  }

  if (!consumedMaterials || !Array.isArray(consumedMaterials) || consumedMaterials.length === 0) {
    throw new HttpsError("invalid-argument", "缺少消耗物料資料，請先填寫物料使用數量。");
  }

  try {
    // 🔧 修復：先在事務外獲取工單數據和查詢香精，然後在事務內執行所有讀寫操作

    // 1. 預先獲取工單數據
    const workOrderRef = db.doc(`workOrders/${workOrderId}`);
    const workOrderSnap = await workOrderRef.get();

    if (!workOrderSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的工單。");
    }

    const workOrderData = workOrderSnap.data()!;
    // 允許 "預報" 和 "進行" 狀態的工單完工
    if (workOrderData.status !== '進行' && workOrderData.status !== '預報') {
      throw new HttpsError("failed-precondition", `工單狀態為 "${workOrderData.status}"，無法完工。`);
    }

    // 2. 🔧 修復：統一處理前端傳來的消耗物料資料
    logger.info(`🔍 [後端診斷] 工單 ${workOrderId} 收到的消耗物料:`, {
      consumedMaterialsLength: consumedMaterials.length,
      items: consumedMaterials.map(item => ({
        materialId: item.materialId,
        materialType: item.materialType,
        consumedQuantity: item.consumedQuantity
      }))
    });

    // 3. 在事務中執行所有讀寫操作
    await db.runTransaction(async (transaction) => {
      // ============ 所有讀取操作必須在最前面 ============

      // 重新驗證工單狀態（確保事務一致性）
      const currentWorkOrderSnap = await transaction.get(workOrderRef);
      if (!currentWorkOrderSnap.exists) {
        throw new HttpsError("not-found", "工單已被刪除。");
      }

      const currentWorkOrderData = currentWorkOrderSnap.data()!;
      if (currentWorkOrderData.status !== '進行' && currentWorkOrderData.status !== '預報') {
        throw new HttpsError("failed-precondition", `工單狀態已變更為 "${currentWorkOrderData.status}"，無法完工。`);
      }

      // 4. 🔧 修復：統一讀取所有消耗物料（物料和香精）
      const itemRefs: any[] = [];

      for (const material of consumedMaterials) {
        if (!material.materialId || !material.consumedQuantity || material.consumedQuantity <= 0) {
          logger.warn(`跳過無效的物料項目:`, material);
          continue;
        }

        const collection = material.materialType === 'fragrance' ? 'fragrances' : 'materials';
        const itemRef = db.doc(`${collection}/${material.materialId}`);
        const itemSnap = await transaction.get(itemRef);

        itemRefs.push({
          ref: itemRef,
          snap: itemSnap,
          material: material,
          itemType: material.materialType === 'fragrance' ? 'fragrance' : 'material',
          consumedQuantity: material.consumedQuantity
        });

        logger.info(`已讀取${material.materialType === 'fragrance' ? '香精' : '物料'}:`, {
          id: material.materialId,
          exists: itemSnap.exists,
          consumedQuantity: material.consumedQuantity
        });
      }

      // ============ 所有讀取操作結束，現在開始所有寫入操作 ============

      // 5. 🔧 修復：先檢查是否有無法處理的項目，如果有則拋出錯誤
      const missingItems = itemRefs.filter(item => !item.snap.exists);
      if (missingItems.length > 0) {
        const missingItemDetails = missingItems.map(item => ({
          id: item.material.materialId,
          type: item.itemType
        }));
        logger.error(`找不到以下項目，無法完工:`, missingItemDetails);
        throw new HttpsError("not-found", `找不到以下項目：${missingItemDetails.map(item => `${item.type}:${item.id}`).join(', ')}`);
      }

      // 6. 更新工單狀態
      transaction.update(workOrderRef, {
        status: '完工',
        actualQuantity: actualQuantity,
        completedAt: FieldValue.serverTimestamp(),
        completedBy: contextAuth.uid,
      });

      // 7. 🔧 修復：統一執行庫存扣除
      const materialDetails: any[] = [];

      logger.info(`準備執行統一庫存更新，總計 ${itemRefs.length} 個項目`);

      for (const itemInfo of itemRefs) {
        const { ref: itemRef, snap: itemSnap, consumedQuantity, itemType } = itemInfo;
        const itemData = itemSnap.data()!;

        const currentStock = itemData.currentStock || 0;
        const newStock = Math.max(0, currentStock - consumedQuantity); // 確保庫存不為負

        // 更新庫存
        transaction.update(itemRef, {
          currentStock: newStock,
          lastStockUpdate: FieldValue.serverTimestamp(),
        });

        // 收集庫存記錄明細
        materialDetails.push({
          itemId: itemRef.id,
          itemType: itemType,
          itemCode: itemData.code || '',
          itemName: itemData.name || '',
          quantityBefore: currentStock,
          quantityChange: -consumedQuantity, // 負數表示消耗
          quantityAfter: newStock,
          changeReason: `工單 ${workOrderData.code || workOrderId} 完工消耗`
        });

        logger.info(`${itemType === 'material' ? '物料' : '香精'}庫存已扣除: ${itemData.name}`, {
          id: itemRef.id,
          code: itemData.code,
          currentStock,
          newStock,
          consumedQuantity
        });
      }

      // 8. 建立庫存紀錄
      if (materialDetails.length > 0) {
        const inventoryRecordRef = db.collection("inventory_records").doc();
        transaction.set(inventoryRecordRef, {
          changeDate: FieldValue.serverTimestamp(),
          changeReason: 'workorder',
          operatorId: contextAuth.uid,
          operatorName: contextAuth.token?.name || '未知用戶',
          remarks: `工單 ${workOrderData.code || workOrderId} 完工，實際生產數量：${actualQuantity}`,
          relatedDocumentId: workOrderId,
          relatedDocumentType: 'work_order',
          details: materialDetails,
          createdAt: FieldValue.serverTimestamp(),
        });
        logger.info(`已建立工單 ${workOrderId} 的庫存紀錄，包含 ${materialDetails.length} 個項目`);
      }
    });

    logger.info(`使用者 ${contextAuth.uid} 成功完成工單 ${workOrderId}`);

    return {
      success: true,
      meta: {
        timestamp: Date.now(),
        requestId: `complete-${workOrderId}-${Date.now()}`
      },
      data: {
        workOrderId: workOrderId,
        message: '工單已成功完工並扣除庫存'
      }
    };
  } catch (error) {
    logger.error(`完成工單 ${workOrderId} 失敗:`, error);
    throw new HttpsError("internal", "工單完工操作失敗");
  }
});
