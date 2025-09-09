"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixFragranceStatus = exports.diagnoseFragranceStatus = exports.deleteFragrance = exports.updateFragranceByCode = exports.updateFragrance = exports.createFragrance = void 0;
// functions/src/api/fragrances.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
exports.createFragrance = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    try {
        // await ensureIsAdmin(contextAuth?.uid);
        const { code, name, fragranceType, fragranceStatus, supplierRef, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, description, notes, remarks, status, unit, currentStock } = data;
        // 驗證必要欄位
        if (!code || !name) {
            throw new https_1.HttpsError('invalid-argument', '請求缺少必要的欄位(代號、名稱)。');
        }
        // 處理向後相容性
        const finalFragranceType = fragranceType || status || '棉芯';
        const finalStatus = status || fragranceType || 'standby'; // 修復：預設改為 standby 以符合前端期望
        const finalFragranceStatus = fragranceStatus || '備用';
        const fragranceData = {
            code,
            name,
            fragranceType: finalFragranceType,
            fragranceStatus: finalFragranceStatus,
            status: finalStatus,
            supplierRef: supplierRef || (supplierId ? db.collection("suppliers").doc(supplierId) : null),
            safetyStockLevel: safetyStockLevel || 0,
            costPerUnit: costPerUnit || 0,
            currentStock: currentStock || 0,
            percentage: percentage || 0,
            pgRatio: pgRatio || 0,
            vgRatio: vgRatio || 0,
            description: description || '',
            notes: notes || '',
            remarks: remarks || '',
            unit: unit || 'KG',
            lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection('fragrances').add(fragranceData);
        return { success: true, fragranceId: docRef.id };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error creating fragrance:', error);
        throw new https_1.HttpsError('internal', '建立香精失敗');
    }
});
exports.updateFragrance = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    firebase_functions_1.logger.info(`開始更新香精，接收到的資料:`, data);
    const { fragranceId, code, name, status, fragranceType, fragranceStatus, supplierId, currentStock, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
    if (!fragranceId || !code || !name) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (ID, 代號、名稱)。");
    }
    // 處理 fragranceType 和 status 的相容性
    const finalFragranceType = fragranceType !== undefined && fragranceType !== null && fragranceType !== '' ? fragranceType : (status || '棉芯');
    const finalStatus = status !== undefined && status !== null && status !== '' ? status : (fragranceType || 'standby'); // 修復：預設改為 standby
    const finalFragranceStatus = fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '' ? fragranceStatus : (status || '備用');
    try {
        const fragranceRef = db.collection("fragrances").doc(fragranceId);
        // 先獲取當前香精資料以檢查庫存變更
        const currentFragrance = await fragranceRef.get();
        const oldStock = ((_a = currentFragrance.data()) === null || _a === void 0 ? void 0 : _a.currentStock) || 0;
        const newStock = Number(currentStock) || 0;
        const stockChanged = oldStock !== newStock;
        firebase_functions_1.logger.info(`香精庫存變更檢查:`, {
            fragranceId,
            oldStock,
            newStock,
            stockChanged,
            oldStockType: typeof oldStock,
            newStockType: typeof newStock,
            currentStockParam: currentStock,
            currentStockParamType: typeof currentStock
        });
        const updateData = {
            code,
            name,
            status: finalStatus,
            fragranceType: finalFragranceType,
            fragranceStatus: finalFragranceStatus,
            currentStock: newStock,
            safetyStockLevel: Number(safetyStockLevel) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            percentage: Number(percentage) || 0,
            pgRatio: Number(pgRatio) || 0,
            vgRatio: Number(vgRatio) || 0,
            unit: unit || 'KG',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        firebase_functions_1.logger.info(`準備更新的資料:`, updateData);
        if (supplierId) {
            updateData.supplierRef = db.collection("suppliers").doc(supplierId);
        }
        else {
            updateData.supplierRef = firestore_1.FieldValue.delete();
        }
        await fragranceRef.update(updateData);
        // 如果庫存有變更，建立庫存紀錄（以動作為單位）
        if (stockChanged) {
            try {
                const inventoryRecordRef = db.collection("inventory_records").doc();
                await inventoryRecordRef.set({
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: 'manual_adjustment',
                    operatorId: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'unknown',
                    operatorName: ((_b = contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.token) === null || _b === void 0 ? void 0 : _b.name) || '未知用戶',
                    remarks: '透過編輯對話框直接修改庫存',
                    relatedDocumentId: fragranceId,
                    relatedDocumentType: 'fragrance_edit',
                    details: [{
                            itemId: fragranceId,
                            itemType: 'fragrance',
                            itemCode: code,
                            itemName: name,
                            quantityChange: newStock - oldStock,
                            quantityAfter: newStock
                        }],
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
                firebase_functions_1.logger.info(`已建立庫存紀錄，庫存從 ${oldStock} 變更為 ${newStock}`);
            }
            catch (error) {
                firebase_functions_1.logger.error(`建立庫存紀錄失敗:`, error);
                // 不阻擋主要更新流程，只記錄錯誤
            }
        }
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更新香精資料: ${fragranceId}`);
        return { status: "success", message: `香精 ${name} 的資料已成功更新。`, };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新香精 ${fragranceId} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "更新香精資料時發生未知錯誤。");
    }
});
exports.updateFragranceByCode = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { code, name, status, fragranceType, fragranceStatus, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit, currentStock } = data;
    if (!code || !name) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (代號、名稱)。");
    }
    // 調試：記錄接收到的參數
    firebase_functions_1.logger.info(`更新香精 ${code} 的參數:`, {
        fragranceType,
        fragranceStatus,
        currentStock,
        supplierId,
        hasFragranceType: !!fragranceType,
        hasFragranceStatus: !!fragranceStatus,
        fragranceTypeLength: (fragranceType === null || fragranceType === void 0 ? void 0 : fragranceType.length) || 0,
        fragranceStatusLength: (fragranceStatus === null || fragranceStatus === void 0 ? void 0 : fragranceStatus.length) || 0
    });
    // 處理 fragranceType 和 status 的相容性
    const finalFragranceType = fragranceType !== undefined && fragranceType !== null && fragranceType !== '' ? fragranceType : (status || '棉芯');
    const finalStatus = status !== undefined && status !== null && status !== '' ? status : (fragranceType || 'standby'); // 修復：預設改為 standby
    const finalFragranceStatus = fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '' ? fragranceStatus : (status || '備用');
    try {
        // 根據香精編號查找現有的香精
        const fragranceQuery = await db.collection("fragrances").where("code", "==", code).limit(1).get();
        if (fragranceQuery.empty) {
            throw new https_1.HttpsError("not-found", `找不到香精編號為 ${code} 的香精。`);
        }
        const fragranceDoc = fragranceQuery.docs[0];
        const fragranceId = fragranceDoc.id;
        const updateData = {
            code,
            name,
            status: finalStatus,
            currentStock: Number(currentStock) || 0,
            safetyStockLevel: Number(safetyStockLevel) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            percentage: Number(percentage) || 0,
            pgRatio: Number(pgRatio) || 0,
            vgRatio: Number(vgRatio) || 0,
            unit: unit || 'KG',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 處理香精種類 - 如果為空則使用預設值
        if (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') {
            updateData.fragranceType = fragranceType;
            firebase_functions_1.logger.info(`更新香精 ${code} 的 fragranceType: ${fragranceType}`);
        }
        else {
            // 如果沒有提供香精種類，使用預設值
            updateData.fragranceType = '棉芯';
            firebase_functions_1.logger.info(`香精 ${code} 的 fragranceType 設置為預設值: ${updateData.fragranceType}`);
        }
        // 處理啟用狀態 - 如果為空則使用預設值
        if (fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '') {
            updateData.fragranceStatus = fragranceStatus;
            firebase_functions_1.logger.info(`更新香精 ${code} 的 fragranceStatus: ${fragranceStatus}`);
        }
        else {
            // 如果沒有提供啟用狀態，使用預設值
            updateData.fragranceStatus = '啟用';
            firebase_functions_1.logger.info(`香精 ${code} 的 fragranceStatus 設置為預設值: ${updateData.fragranceStatus}`);
        }
        // 如果提供了 currentStock，則更新庫存
        if (currentStock !== undefined && currentStock !== null && currentStock !== '') {
            updateData.currentStock = Number(currentStock) || 0;
            updateData.lastStockUpdate = firestore_1.FieldValue.serverTimestamp();
        }
        if (supplierId) {
            updateData.supplierRef = db.collection("suppliers").doc(supplierId);
        }
        else {
            updateData.supplierRef = firestore_1.FieldValue.delete();
        }
        await fragranceDoc.ref.update(updateData);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功根據編號更新香精資料: ${code} (ID: ${fragranceId})`);
        return { status: "success", message: `香精 ${name} (編號: ${code}) 的資料已成功更新。`, fragranceId };
    }
    catch (error) {
        firebase_functions_1.logger.error(`根據編號更新香精 ${code} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "更新香精資料時發生未知錯誤。");
    }
});
exports.deleteFragrance = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { fragranceId } = data;
    if (!fragranceId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少 fragranceId。");
    }
    try {
        await db.collection("fragrances").doc(fragranceId).delete();
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功刪除香精: ${fragranceId}`);
        return { status: "success", message: "香精已成功刪除。", };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除香精 ${fragranceId} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "刪除香精時發生未知錯誤。");
    }
});
// 診斷和修復香精狀態
exports.diagnoseFragranceStatus = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    try {
        firebase_functions_1.logger.info('開始診斷香精狀態...');
        // 獲取所有香精
        const fragrancesQuery = await db.collection('fragrances').get();
        const allFragrances = fragrancesQuery.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        firebase_functions_1.logger.info(`總共找到 ${allFragrances.length} 個香精`);
        // 統計狀態分布
        const statusStats = {
            active: 0,
            standby: 0,
            deprecated: 0,
            undefined: 0,
            other: 0
        };
        const problematicFragrances = [];
        allFragrances.forEach((fragrance) => {
            const status = fragrance.status;
            if (status === 'active') {
                statusStats.active++;
            }
            else if (status === 'standby') {
                statusStats.standby++;
            }
            else if (status === 'deprecated') {
                statusStats.deprecated++;
            }
            else if (!status) {
                statusStats.undefined++;
                problematicFragrances.push({
                    id: fragrance.id,
                    name: fragrance.name || '未知',
                    code: fragrance.code || '未知',
                    issue: 'missing_status'
                });
            }
            else {
                statusStats.other++;
                problematicFragrances.push({
                    id: fragrance.id,
                    name: fragrance.name || '未知',
                    code: fragrance.code || '未知',
                    status: status,
                    issue: 'invalid_status'
                });
            }
        });
        firebase_functions_1.logger.info('香精狀態統計:', statusStats);
        firebase_functions_1.logger.info('有問題的香精:', problematicFragrances);
        return {
            success: true,
            totalFragrances: allFragrances.length,
            statusStats,
            problematicFragrances,
            message: `診斷完成：總共 ${allFragrances.length} 個香精，發現 ${problematicFragrances.length} 個狀態異常`
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('診斷香精狀態失敗:', error);
        throw new https_1.HttpsError('internal', '診斷香精狀態時發生錯誤');
    }
});
// 修復香精狀態
exports.fixFragranceStatus = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    try {
        firebase_functions_1.logger.info('開始修復香精狀態...');
        // 獲取所有香精
        const fragrancesQuery = await db.collection('fragrances').get();
        let fixedCount = 0;
        const batch = db.batch();
        fragrancesQuery.docs.forEach(doc => {
            const data = doc.data();
            const currentStatus = data.status;
            // 修復邏輯：如果狀態不正確，設為 standby
            if (!currentStatus || !['active', 'standby', 'deprecated'].includes(currentStatus)) {
                batch.update(doc.ref, {
                    status: 'standby',
                    updatedAt: firestore_1.FieldValue.serverTimestamp()
                });
                fixedCount++;
                firebase_functions_1.logger.info(`修復香精 ${data.name} (${data.code}) 狀態從 "${currentStatus}" 改為 "standby"`);
            }
        });
        if (fixedCount > 0) {
            await batch.commit();
            firebase_functions_1.logger.info(`批量修復完成，共修復 ${fixedCount} 個香精`);
        }
        else {
            firebase_functions_1.logger.info('所有香精狀態正常，無需修復');
        }
        return {
            success: true,
            fixedCount,
            message: `修復完成，共修復 ${fixedCount} 個香精的狀態`
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('修復香精狀態失敗:', error);
        throw new https_1.HttpsError('internal', '修復香精狀態時發生錯誤');
    }
});
//# sourceMappingURL=fragrances.js.map