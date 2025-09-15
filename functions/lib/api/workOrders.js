"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeWorkOrder = exports.deleteWorkOrder = exports.addTimeRecord = exports.updateWorkOrder = exports.createWorkOrder = void 0;
// functions/src/api/workOrders.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../utils/auth");
const db = (0, firestore_1.getFirestore)();
/**
 * Creates a new work order based on a product and target quantity with advanced BOM calculation.
 */
exports.createWorkOrder = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureIsAdminOrForeman(contextAuth?.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { productId, targetQuantity, fragranceId, nicotineMg, bomItems } = data;
    if (!productId || typeof targetQuantity !== 'number' || targetQuantity <= 0) {
        throw new https_1.HttpsError("invalid-argument", "缺少有效的產品 ID 或目標產量。");
    }
    const createdByRef = db.doc(`users/${contextAuth.uid}`);
    try {
        // 1. Generate a unique work order code
        const today = new Date().toISOString().split('T')[0];
        const counterRef = db.doc(`counters/workOrders_${today}`);
        const newCount = await db.runTransaction(async (t) => {
            var _a;
            const doc = await t.get(counterRef);
            const count = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.count) || 0) + 1 : 1;
            t.set(counterRef, { count }, { merge: true });
            return count;
        });
        const sequence = String(newCount).padStart(3, '0');
        const woCode = `WO-${today.replace(/-/g, "")}-${sequence}`;
        // 2. Fetch product data
        const productRef = db.doc(`products/${productId}`);
        const productSnap = await productRef.get();
        if (!productSnap.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的產品。");
        }
        const productData = productSnap.data();
        // 3. Fetch fragrance data
        let fragranceData = null;
        let fragranceRef = null;
        if (fragranceId) {
            fragranceRef = db.doc(`fragrances/${fragranceId}`);
            const fragranceSnap = await fragranceRef.get();
            if (fragranceSnap.exists) {
                fragranceData = fragranceSnap.data();
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
            }
            catch (error) {
                firebase_functions_1.logger.warn(`無法從產品香精代號找到香精資料:`, error);
            }
        }
        // 4. Fetch series data for seriesName
        let seriesName = '未指定';
        if (productData.seriesRef) {
            try {
                const seriesSnap = await productData.seriesRef.get();
                if (seriesSnap.exists) {
                    const seriesData = seriesSnap.data();
                    seriesName = seriesData.name || '未指定';
                }
            }
            catch (error) {
                firebase_functions_1.logger.warn(`無法載入產品系列資料:`, error);
            }
        }
        // 5. Build Bill of Materials (BOM) from provided bomItems
        const billOfMaterials = [];
        if (bomItems && Array.isArray(bomItems)) {
            for (const bomItem of bomItems) {
                try {
                    const materialRef = db.doc(`${bomItem.materialType === 'fragrance' ? 'fragrances' : 'materials'}/${bomItem.materialId}`);
                    const materialSnap = await materialRef.get();
                    if (materialSnap.exists) {
                        const materialData = materialSnap.data();
                        billOfMaterials.push({
                            id: bomItem.materialId,
                            name: materialData.name,
                            code: materialData.code,
                            type: bomItem.materialType,
                            category: materialData.category || 'common',
                            unit: bomItem.unit,
                            quantity: bomItem.requiredQuantity,
                            ratio: materialData.percentage || materialData.pgRatio || materialData.vgRatio || nicotineMg,
                            isCalculated: true,
                        });
                    }
                }
                catch (error) {
                    firebase_functions_1.logger.warn(`無法載入物料 ${bomItem.materialId}:`, error);
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
                fragranceName: (fragranceData === null || fragranceData === void 0 ? void 0 : fragranceData.name) || productData.fragranceName || '未指定',
                fragranceCode: (fragranceData === null || fragranceData === void 0 ? void 0 : fragranceData.code) || productData.fragranceCode || '未指定',
                nicotineMg: nicotineMg || productData.nicotineMg || 0,
            },
            billOfMaterials: billOfMaterials,
            targetQuantity: targetQuantity,
            actualQuantity: 0,
            status: "未確認",
            qcStatus: "未檢驗",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            createdByRef: createdByRef,
            notes: "",
            timeRecords: [],
        });
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 成功建立了工單 ${woCode} (ID: ${workOrderRef.id})`);
        return { success: true, workOrderId: workOrderRef.id, workOrderCode: woCode };
    }
    catch (error) {
        firebase_functions_1.logger.error(`建立工單時發生嚴重錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "建立工單時發生未知錯誤。");
    }
});
/**
 * Updates a work order with new data.
 */
exports.updateWorkOrder = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureIsAdminOrForeman(contextAuth?.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { workOrderId, updates } = data;
    if (!workOrderId || !updates) {
        throw new https_1.HttpsError("invalid-argument", "缺少工單 ID 或更新資料。");
    }
    try {
        const workOrderRef = db.doc(`workOrders/${workOrderId}`);
        const workOrderSnap = await workOrderRef.get();
        if (!workOrderSnap.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的工單。");
        }
        // 只允許更新特定欄位
        const allowedUpdates = {
            status: updates.status,
            qcStatus: updates.qcStatus,
            actualQuantity: updates.actualQuantity,
            targetQuantity: updates.targetQuantity,
            notes: updates.notes,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        await workOrderRef.update(allowedUpdates);
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 成功更新了工單 ${workOrderId}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新工單時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "更新工單時發生未知錯誤。");
    }
});
/**
 * Adds a time record to a work order.
 * 統一使用 timeEntries 集合，廢除 workOrderTimeRecords
 */
exports.addTimeRecord = (0, https_1.onCall)(async (request) => {
    var _a;
    const { auth: contextAuth, data } = request;
    // await ensureIsAdminOrForeman(contextAuth?.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { workOrderId, timeRecord } = data;
    if (!workOrderId || !timeRecord) {
        throw new https_1.HttpsError("invalid-argument", "缺少工單 ID 或工時紀錄資料。");
    }
    try {
        // 驗證工單存在
        const workOrderRef = db.doc(`workOrders/${workOrderId}`);
        const workOrderSnap = await workOrderRef.get();
        if (!workOrderSnap.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的工單。");
        }
        const workOrderData = workOrderSnap.data();
        // 驗證人員存在
        const personnelRef = db.doc(`personnel/${timeRecord.personnelId}`);
        const personnelSnap = await personnelRef.get();
        if (!personnelSnap.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的人員。");
        }
        const personnelData = personnelSnap.data();
        // 計算工時（轉換為小時制）
        const startDateTime = new Date(`${timeRecord.workDate}T${timeRecord.startTime}`);
        const endDateTime = new Date(`${timeRecord.workDate}T${timeRecord.endTime}`);
        if (endDateTime <= startDateTime) {
            throw new https_1.HttpsError("invalid-argument", "結束時間必須晚於開始時間。");
        }
        const diffMs = endDateTime.getTime() - startDateTime.getTime();
        const durationHours = diffMs / (1000 * 60 * 60); // 轉為小時制
        // 建立統一的工時記錄（使用 timeEntries 格式）
        const timeEntryData = {
            workOrderId: workOrderId,
            workOrderCode: workOrderData.code,
            workOrderNumber: workOrderData.code,
            productName: ((_a = workOrderData.productSnapshot) === null || _a === void 0 ? void 0 : _a.name) || '',
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 儲存到統一的 timeEntries 集合
        const timeEntryRef = await db.collection('timeEntries').add(timeEntryData);
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 成功新增工時記錄到工單 ${workOrderId}，使用統一 timeEntries 集合`);
        return { success: true, timeEntryId: timeEntryRef.id };
    }
    catch (error) {
        firebase_functions_1.logger.error(`新增工時紀錄時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "新增工時紀錄時發生未知錯誤。");
    }
});
/**
 * Deletes a work order and all related time entries.
 */
exports.deleteWorkOrder = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    await (0, auth_1.ensureIsAdminOrForeman)(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { workOrderId } = data;
    if (!workOrderId) {
        throw new https_1.HttpsError("invalid-argument", "缺少工單 ID。");
    }
    try {
        await db.runTransaction(async (transaction) => {
            // 1. 驗證工單存在
            const workOrderRef = db.doc(`workOrders/${workOrderId}`);
            const workOrderSnap = await transaction.get(workOrderRef);
            if (!workOrderSnap.exists) {
                throw new https_1.HttpsError("not-found", "找不到指定的工單。");
            }
            const workOrderData = workOrderSnap.data();
            // 2. 檢查工單狀態 - 只允許刪除未開始或已取消的工單
            if (workOrderData.status === '進行' || workOrderData.status === '完工') {
                throw new https_1.HttpsError("failed-precondition", `無法刪除狀態為 "${workOrderData.status}" 的工單。`);
            }
            // 3. 查詢並刪除相關的工時記錄（統一使用 timeEntries）
            const timeEntriesQuery = await db.collection('timeEntries')
                .where('workOrderId', '==', workOrderId)
                .get();
            firebase_functions_1.logger.info(`找到 ${timeEntriesQuery.size} 筆與工單 ${workOrderId} 相關的工時記錄`);
            // 刪除所有工時記錄
            timeEntriesQuery.docs.forEach(doc => {
                transaction.delete(doc.ref);
            });
            // 4. 刪除工單
            transaction.delete(workOrderRef);
            firebase_functions_1.logger.info(`已刪除工單 ${workOrderId} 及其相關的 ${timeEntriesQuery.size} 筆工時記錄`);
        });
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 成功刪除工單 ${workOrderId} 及其相關工時記錄`);
        return {
            success: true,
            message: `成功刪除工單及其相關工時記錄`,
            deletedTimeEntries: 0 // 實際數量會在 transaction 中計算
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除工單時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "刪除工單時發生未知錯誤。");
    }
});
/**
 * Completes a work order and records material consumption.
 */
exports.completeWorkOrder = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureIsAdminOrForeman(contextAuth?.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { workOrderId, actualQuantity, consumedMaterials } = data;
    if (!workOrderId || typeof actualQuantity !== 'number' || actualQuantity < 0) {
        throw new https_1.HttpsError("invalid-argument", "缺少工單 ID 或實際產量。");
    }
    try {
        // 🔧 修復：先在事務外獲取工單數據和查詢香精，然後在事務內執行所有讀寫操作
        // 1. 預先獲取工單數據
        const workOrderRef = db.doc(`workOrders/${workOrderId}`);
        const workOrderSnap = await workOrderRef.get();
        if (!workOrderSnap.exists) {
            throw new https_1.HttpsError("not-found", "找不到指定的工單。");
        }
        const workOrderData = workOrderSnap.data();
        // 允許 "預報" 和 "進行" 狀態的工單完工
        if (workOrderData.status !== '進行' && workOrderData.status !== '預報') {
            throw new https_1.HttpsError("failed-precondition", `工單狀態為 "${workOrderData.status}"，無法完工。`);
        }
        // 2. 預先查詢所有需要的香精（事務外）
        const fragranceIdMap = new Map();
        // 🔍 診斷日誌：檢查工單中的所有BOM項目
        firebase_functions_1.logger.info(`🔍 [後端診斷] 工單 ${workOrderId} 的完整BOM檢查:`);
        firebase_functions_1.logger.info(`🔍 [後端診斷] 總BOM項目數: ${(workOrderData.billOfMaterials || []).length}`);
        (workOrderData.billOfMaterials || []).forEach((item, index) => {
            firebase_functions_1.logger.info(`🔍 [後端診斷] BOM[${index}]:`, {
                id: item.id,
                name: item.name,
                type: item.type,
                category: item.category,
                usedQuantity: item.usedQuantity,
                isFragrance: item.type === 'fragrance' || item.category === 'fragrance',
                hasPositiveQuantity: (item.usedQuantity || 0) > 0
            });
        });
        const fragranceBOMItems = (workOrderData.billOfMaterials || [])
            .filter((item) => item.type === 'fragrance' || item.category === 'fragrance')
            .filter((item) => (item.usedQuantity || 0) > 0);
        firebase_functions_1.logger.info(`🔍 [後端診斷] 篩選出的香精項目數: ${fragranceBOMItems.length}`);
        fragranceBOMItems.forEach((item, index) => {
            firebase_functions_1.logger.info(`🔍 [後端診斷] 香精[${index}]:`, {
                id: item.id,
                name: item.name,
                usedQuantity: item.usedQuantity
            });
        });
        for (const fragranceItem of fragranceBOMItems) {
            if (fragranceItem.id && !fragranceItem.id.startsWith('temp_fragrance_')) {
                // 直接使用ID
                fragranceIdMap.set(fragranceItem.id, fragranceItem.id);
            }
            else if (fragranceItem.code) {
                // 在事務外查詢代號對應的ID
                try {
                    const fragranceQuery = await db.collection('fragrances')
                        .where('code', '==', fragranceItem.code)
                        .limit(1)
                        .get();
                    if (!fragranceQuery.empty) {
                        const fragranceDoc = fragranceQuery.docs[0];
                        fragranceIdMap.set(fragranceItem.code, fragranceDoc.id);
                        firebase_functions_1.logger.info(`✅ 找到香精: ${fragranceItem.code} -> ${fragranceDoc.id}`);
                    }
                    else {
                        firebase_functions_1.logger.warn(`⚠️ 找不到香精: ${fragranceItem.code}`);
                    }
                }
                catch (error) {
                    firebase_functions_1.logger.error(`查詢香精時發生錯誤: ${fragranceItem.code}`, error);
                }
            }
        }
        // 3. 在事務中執行所有讀寫操作
        await db.runTransaction(async (transaction) => {
            // ============ 所有讀取操作必須在最前面 ============
            var _a, _b;
            // 重新驗證工單狀態（確保事務一致性）
            const currentWorkOrderSnap = await transaction.get(workOrderRef);
            if (!currentWorkOrderSnap.exists) {
                throw new https_1.HttpsError("not-found", "工單已被刪除。");
            }
            const currentWorkOrderData = currentWorkOrderSnap.data();
            if (currentWorkOrderData.status !== '進行' && currentWorkOrderData.status !== '預報') {
                throw new https_1.HttpsError("failed-precondition", `工單狀態已變更為 "${currentWorkOrderData.status}"，無法完工。`);
            }
            // 4. 讀取所有需要的物料數據
            const materialRefs = [];
            const materialSnaps = [];
            if (consumedMaterials && Array.isArray(consumedMaterials)) {
                for (const material of consumedMaterials) {
                    if (!material.materialId || !material.consumedQuantity || material.consumedQuantity <= 0) {
                        continue;
                    }
                    const materialRef = db.doc(`materials/${material.materialId}`);
                    materialRefs.push({ ref: materialRef, consumedQuantity: material.consumedQuantity });
                    const materialSnap = await transaction.get(materialRef);
                    materialSnaps.push(materialSnap);
                }
            }
            // 5. 讀取所有需要的香精數據
            const fragranceRefs = [];
            for (const fragranceItem of fragranceBOMItems) {
                const fragranceId = fragranceIdMap.get(fragranceItem.id || fragranceItem.code);
                if (fragranceId) {
                    const fragranceRef = db.doc(`fragrances/${fragranceId}`);
                    const fragranceSnap = await transaction.get(fragranceRef);
                    if (fragranceSnap.exists) {
                        fragranceRefs.push({
                            ref: fragranceRef,
                            snap: fragranceSnap,
                            item: fragranceItem,
                            consumedQuantity: fragranceItem.usedQuantity || 0
                        });
                    }
                }
            }
            // ============ 所有讀取操作結束，現在開始所有寫入操作 ============
            // 6. 更新工單狀態
            transaction.update(workOrderRef, {
                status: '完工',
                actualQuantity: actualQuantity,
                completedAt: firestore_1.FieldValue.serverTimestamp(),
                completedBy: contextAuth.uid,
            });
            // 7. 🎯 準備統一API的庫存更新請求（物料和香精消耗）
            const allConsumptionUpdates = [];
            // 7.1 處理物料消耗
            firebase_functions_1.logger.info(`開始處理工單 ${workOrderId} 的物料消耗:`, {
                consumedMaterials: consumedMaterials || 'null',
                consumedMaterialsLength: consumedMaterials ? consumedMaterials.length : 0
            });
            for (let i = 0; i < materialRefs.length; i++) {
                const { ref: materialRef, consumedQuantity } = materialRefs[i];
                const materialSnap = materialSnaps[i];
                if (materialSnap.exists && consumedQuantity > 0) {
                    allConsumptionUpdates.push({
                        itemId: materialRef.id,
                        itemType: 'material',
                        operation: 'subtract',
                        quantity: consumedQuantity,
                        reason: `工單 ${workOrderId} 完工消耗`
                    });
                }
            }
            // 7.2 處理香精消耗
            for (const fragranceInfo of fragranceRefs) {
                try {
                    const { snap: fragranceSnap, consumedQuantity } = fragranceInfo;
                    if (fragranceSnap.exists && consumedQuantity > 0) {
                        allConsumptionUpdates.push({
                            itemId: fragranceSnap.id,
                            itemType: 'fragrance',
                            operation: 'subtract',
                            quantity: consumedQuantity,
                            reason: `工單 ${workOrderId} 香精消耗`
                        });
                    }
                }
                catch (error) {
                    firebase_functions_1.logger.error(`處理香精消耗時發生錯誤:`, error);
                }
            }
            // 7.3 🎯 執行統一庫存更新（在同一事務內）
            const materialDetails = [];
            const failedUpdates = [];
            firebase_functions_1.logger.info(`準備執行統一庫存更新，總計 ${allConsumptionUpdates.length} 個項目`);
            for (const update of allConsumptionUpdates) {
                try {
                    const itemRef = db.doc(`${update.itemType === 'material' ? 'materials' : 'fragrances'}/${update.itemId}`);
                    const itemDoc = await transaction.get(itemRef);
                    if (!itemDoc.exists) {
                        failedUpdates.push({
                            itemId: update.itemId,
                            error: 'Item not found',
                            details: { reason: '找不到指定項目' }
                        });
                        continue;
                    }
                    const currentStock = ((_a = itemDoc.data()) === null || _a === void 0 ? void 0 : _a.currentStock) || 0;
                    const newStock = Math.max(0, currentStock - update.quantity); // 工單消耗，使用subtract但確保不為負
                    // 更新庫存
                    transaction.update(itemRef, {
                        currentStock: newStock,
                        lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
                    });
                    // 獲取項目詳細信息
                    const itemData = itemDoc.data();
                    // 收集庫存記錄明細
                    materialDetails.push({
                        itemId: update.itemId,
                        itemType: update.itemType,
                        itemCode: itemData.code || '',
                        itemName: itemData.name || '',
                        quantityBefore: currentStock,
                        quantityChange: -update.quantity,
                        quantityAfter: newStock,
                        changeReason: update.reason
                    });
                    firebase_functions_1.logger.info(`${update.itemType === 'material' ? '物料' : '香精'}庫存已扣除: ${itemData.name}`, {
                        id: update.itemId,
                        code: itemData.code,
                        currentStock,
                        newStock,
                        consumedQuantity: update.quantity
                    });
                }
                catch (error) {
                    firebase_functions_1.logger.error(`處理項目 ${update.itemId} 時發生錯誤:`, error);
                    failedUpdates.push({
                        itemId: update.itemId,
                        error: error instanceof Error ? error.message : String(error),
                        details: { originalUpdate: update }
                    });
                }
            }
            // 7.4 建立統一的庫存紀錄
            firebase_functions_1.logger.info(`準備建立庫存紀錄:`, {
                materialDetailsLength: materialDetails.length,
                failedUpdatesLength: failedUpdates.length
            });
            if (materialDetails.length > 0) {
                const inventoryRecordRef = db.collection("inventory_records").doc();
                transaction.set(inventoryRecordRef, {
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: 'workorder',
                    operatorId: contextAuth.uid,
                    operatorName: ((_b = contextAuth.token) === null || _b === void 0 ? void 0 : _b.name) || '未知用戶',
                    remarks: `工單 ${workOrderData.code || workOrderId} 完工，實際生產數量：${actualQuantity}`,
                    relatedDocumentId: workOrderId,
                    relatedDocumentType: 'work_order',
                    details: materialDetails,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
                firebase_functions_1.logger.info(`已建立工單 ${workOrderId} 的庫存紀錄，包含 ${materialDetails.length} 個項目`);
            }
            else {
                firebase_functions_1.logger.warn(`工單 ${workOrderId} 完工但沒有物料消耗記錄，未建立庫存紀錄`);
            }
            // 如果有失敗項目，記錄警告但不阻斷流程
            if (failedUpdates.length > 0) {
                firebase_functions_1.logger.warn(`工單 ${workOrderId} 完工時部分項目處理失敗:`, failedUpdates);
            }
        });
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 成功完成工單 ${workOrderId}`);
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
    }
    catch (error) {
        firebase_functions_1.logger.error(`完成工單 ${workOrderId} 失敗:`, error);
        throw new https_1.HttpsError("internal", "工單完工操作失敗");
    }
});
//# sourceMappingURL=workOrders.js.map