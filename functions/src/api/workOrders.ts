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

    // 驗證人員存在
    const personnelRef = db.doc(`personnel/${timeRecord.personnelId}`);
    const personnelSnap = await personnelRef.get();
    
    if (!personnelSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的人員。");
    }

    const personnelData = personnelSnap.data()!;

    // 計算工時
    const startDateTime = new Date(`${timeRecord.workDate}T${timeRecord.startTime}`);
    const endDateTime = new Date(`${timeRecord.workDate}T${timeRecord.endTime}`);
    
    if (endDateTime <= startDateTime) {
      throw new HttpsError("invalid-argument", "結束時間必須晚於開始時間。");
    }

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // 建立工時紀錄
    const timeRecordData = {
      workOrderId: workOrderId,
      personnelId: timeRecord.personnelId,
      personnelName: personnelData.name,
      workDate: timeRecord.workDate,
      startTime: timeRecord.startTime,
      endTime: timeRecord.endTime,
      hours,
      minutes,
      totalMinutes,
      createdAt: FieldValue.serverTimestamp(),
    };

    // 儲存到工時紀錄集合
    const timeRecordRef = await db.collection('workOrderTimeRecords').add(timeRecordData);

    // 更新工單的工時紀錄陣列
    await workOrderRef.update({
      timeRecords: FieldValue.arrayUnion({
        id: timeRecordRef.id,
        ...timeRecordData,
      }),
    });
    
    logger.info(`使用者 ${contextAuth.uid} 成功新增工時紀錄到工單 ${workOrderId}`);
    return { success: true, timeRecordId: timeRecordRef.id };

  } catch (error) {
    logger.error(`新增工時紀錄時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "新增工時紀錄時發生未知錯誤。");
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

  try {
    await db.runTransaction(async (transaction) => {
      // 1. 驗證工單存在且狀態正確
      const workOrderRef = db.doc(`workOrders/${workOrderId}`);
      const workOrderSnap = await transaction.get(workOrderRef);
      
      if (!workOrderSnap.exists) {
        throw new HttpsError("not-found", "找不到指定的工單。");
      }

      const workOrderData = workOrderSnap.data()!;
      if (workOrderData.status !== '進行') {
        throw new HttpsError("failed-precondition", `工單狀態為 "${workOrderData.status}"，無法完工。`);
      }

      // 2. 更新工單狀態
      transaction.update(workOrderRef, {
        status: '完工',
        actualQuantity: actualQuantity,
        completedAt: FieldValue.serverTimestamp(),
        completedBy: contextAuth.uid,
      });

      // 3. 處理物料消耗和庫存紀錄
      // 收集所有消耗的物料明細
      const materialDetails = [];
      
      logger.info(`開始處理工單 ${workOrderId} 的物料消耗:`, { 
        consumedMaterials: consumedMaterials || 'null',
        consumedMaterialsLength: consumedMaterials ? consumedMaterials.length : 0
      });
      
      if (consumedMaterials && Array.isArray(consumedMaterials)) {
        
        for (const material of consumedMaterials) {
          if (!material.materialId || !material.consumedQuantity || material.consumedQuantity <= 0) {
            continue;
          }

          const materialRef = db.doc(`materials/${material.materialId}`);
          const materialSnap = await transaction.get(materialRef);
          
          if (materialSnap.exists) {
            const materialData = materialSnap.data()!;
            const currentStock = materialData.currentStock || 0;
            const newStock = Math.max(0, currentStock - material.consumedQuantity);

            // 更新庫存
            transaction.update(materialRef, {
              currentStock: newStock,
              lastStockUpdate: FieldValue.serverTimestamp(),
            });

            // 收集物料明細
            materialDetails.push({
              itemId: material.materialId,
              itemType: 'material',
              itemCode: materialData.code || '',
              itemName: materialData.name || '',
              quantityChange: -material.consumedQuantity, // 負數表示消耗
              quantityAfter: newStock
            });
          }
        }
      }

      // 4. 處理香精消耗（如果有的話）
      if (workOrderData.fragranceRef) {
        try {
          // 確保 fragranceRef 是一個有效的文檔引用
          const fragranceRef = workOrderData.fragranceRef;
          if (fragranceRef && typeof fragranceRef.get === 'function') {
            const fragranceSnap = await transaction.get(fragranceRef);
            
            // 使用類型斷言來解決 TypeScript 類型問題
            if (fragranceSnap && (fragranceSnap as any).exists && (fragranceSnap as any).exists()) {
              const fragranceData = (fragranceSnap as any).data();
              if (fragranceData) {
                const currentStock = fragranceData.currentStock || 0;
                // 假設每單位產品消耗固定數量的香精
                const consumedFragrance = (workOrderData.fragranceRatio || 0.01) * actualQuantity;
                const newStock = Math.max(0, currentStock - consumedFragrance);

                // 更新香精庫存
                transaction.update(fragranceRef, {
                  currentStock: newStock,
                  lastStockUpdate: FieldValue.serverTimestamp(),
                });

                // 收集香精明細
                materialDetails.push({
                  itemId: fragranceRef.id,
                  itemType: 'fragrance',
                  itemCode: fragranceData.code || '',
                  itemName: fragranceData.name || '',
                  quantityChange: -consumedFragrance, // 負數表示消耗
                  quantityAfter: newStock
                });
              }
            }
          }
        } catch (error) {
          logger.warn(`處理香精消耗時發生錯誤:`, error);
          // 不阻擋主要流程，只記錄警告
        }
      }

      // 5. 建立統一的庫存紀錄（以動作為單位）
      logger.info(`準備建立庫存紀錄:`, { 
        materialDetailsLength: materialDetails.length,
        materialDetails: materialDetails
      });
      
      if (materialDetails.length > 0) {
        const inventoryRecordRef = db.collection("inventory_records").doc();
        transaction.set(inventoryRecordRef, {
          changeDate: FieldValue.serverTimestamp(),
          changeReason: 'workorder',
          operatorId: contextAuth.uid,
          operatorName: contextAuth.token?.name || '未知用戶',
          remarks: `工單 ${workOrderData.workOrderNumber || workOrderId} 完工，實際生產數量：${actualQuantity}`,
          relatedDocumentId: workOrderId,
          relatedDocumentType: 'work_order',
          details: materialDetails,
          createdAt: FieldValue.serverTimestamp(),
        });
        logger.info(`已建立工單 ${workOrderId} 的庫存紀錄，包含 ${materialDetails.length} 個項目`);
      } else {
        logger.warn(`工單 ${workOrderId} 完工但沒有物料消耗記錄，未建立庫存紀錄`);
      }
    });

    logger.info(`使用者 ${contextAuth.uid} 成功完成工單 ${workOrderId}`);
    return { success: true };

  } catch (error) {
    logger.error(`完工工單時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "完工工單時發生未知錯誤。");
  }
});
