// functions/src/api/fragrances.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

interface FragranceData {
  code: string;
  name: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierRef?: DocumentReference;
  supplierId?: string;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  description?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  unit?: string;
  currentStock?: number;
  updatedAt?: FieldValue;
  createdAt?: FieldValue;
  lastStockUpdate?: FieldValue;
}

export const createFragrance = onCall<FragranceData>(async (request) => {
  const { data, auth: contextAuth } = request;
  try {
    // await ensureIsAdmin(contextAuth?.uid);
    const { code, name, fragranceType, fragranceStatus, supplierRef, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, description, notes, remarks, status, unit, currentStock } = data;

    // 驗證必要欄位
    if (!code || !name) {
      throw new HttpsError('invalid-argument', '請求缺少必要的欄位(代號、名稱)。');
    }

    // 處理向後相容性
    const finalFragranceType = fragranceType || status || '棉芯';
    const finalStatus = status || fragranceType || 'active';
    const finalFragranceStatus = fragranceStatus || '啟用';

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
      lastStockUpdate: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('fragrances').add(fragranceData);
    
    return { success: true, fragranceId: docRef.id };
  } catch (error) {
    logger.error('Error creating fragrance:', error);
    throw new HttpsError('internal', '建立香精失敗');
  }
});

export const updateFragrance = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureIsAdmin(contextAuth?.uid);
  const { fragranceId, code, name, status, fragranceType, fragranceStatus, supplierId, currentStock, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
  if (!fragranceId || !code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (ID, 代號、名稱)。"); }
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType !== undefined && fragranceType !== null && fragranceType !== '' ? fragranceType : (status || '棉芯');
  const finalStatus = status !== undefined && status !== null && status !== '' ? status : (fragranceType || 'active');
  const finalFragranceStatus = fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '' ? fragranceStatus : (status || '啟用');
  
  try {
    const fragranceRef = db.collection("fragrances").doc(fragranceId);
    const updateData: any = { 
      code, 
      name, 
      status: finalStatus, 
      fragranceType: finalFragranceType,
      fragranceStatus: finalFragranceStatus,
      currentStock: Number(currentStock) || 0,
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      percentage: Number(percentage) || 0, 
      pgRatio: Number(pgRatio) || 0, 
      vgRatio: Number(vgRatio) || 0, 
      unit: unit || 'KG',
      updatedAt: FieldValue.serverTimestamp(), 
    };
    if (supplierId) { 
      updateData.supplierRef = db.collection("suppliers").doc(supplierId); 
    } else { 
      updateData.supplierRef = FieldValue.delete(); 
    }
    await fragranceRef.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功更新香精資料: ${fragranceId}`);
    return { status: "success", message: `香精 ${name} 的資料已成功更新。`, };
  } catch (error) { logger.error(`更新香精 ${fragranceId} 時發生錯誤:`, error); throw new HttpsError("internal", "更新香精資料時發生未知錯誤。"); }
});

export const updateFragranceByCode = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureIsAdmin(contextAuth?.uid);
  const { code, name, status, fragranceType, fragranceStatus, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit, currentStock } = data;
  if (!code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (代號、名稱)。"); }
  
  // 調試：記錄接收到的參數
  logger.info(`更新香精 ${code} 的參數:`, {
    fragranceType,
    fragranceStatus,
    currentStock,
    supplierId,
    hasFragranceType: !!fragranceType,
    hasFragranceStatus: !!fragranceStatus,
    fragranceTypeLength: fragranceType?.length || 0,
    fragranceStatusLength: fragranceStatus?.length || 0
  });
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType !== undefined && fragranceType !== null && fragranceType !== '' ? fragranceType : (status || '棉芯');
  const finalStatus = status !== undefined && status !== null && status !== '' ? status : (fragranceType || 'active');
  const finalFragranceStatus = fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '' ? fragranceStatus : (status || '啟用');
  
  try {
    // 根據香精編號查找現有的香精
    const fragranceQuery = await db.collection("fragrances").where("code", "==", code).limit(1).get();
    
    if (fragranceQuery.empty) {
      throw new HttpsError("not-found", `找不到香精編號為 ${code} 的香精。`);
    }
    
    const fragranceDoc = fragranceQuery.docs[0];
    const fragranceId = fragranceDoc.id;
    
    const updateData: any = { 
      code, 
      name, 
      status: finalStatus, 
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      percentage: Number(percentage) || 0, 
      pgRatio: Number(pgRatio) || 0, 
      vgRatio: Number(vgRatio) || 0, 
      unit: unit || 'KG',
      updatedAt: FieldValue.serverTimestamp(), 
    };
    
    // 處理香精種類 - 如果為空則使用預設值
    if (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') {
      updateData.fragranceType = fragranceType;
      logger.info(`更新香精 ${code} 的 fragranceType: ${fragranceType}`);
    } else {
      // 如果沒有提供香精種類，使用預設值
      updateData.fragranceType = '棉芯';
      logger.info(`香精 ${code} 的 fragranceType 設置為預設值: ${updateData.fragranceType}`);
    }
    
    // 處理啟用狀態 - 如果為空則使用預設值
    if (fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '') {
      updateData.fragranceStatus = fragranceStatus;
      logger.info(`更新香精 ${code} 的 fragranceStatus: ${fragranceStatus}`);
    } else {
      // 如果沒有提供啟用狀態，使用預設值
      updateData.fragranceStatus = '啟用';
      logger.info(`香精 ${code} 的 fragranceStatus 設置為預設值: ${updateData.fragranceStatus}`);
    }
    
    // 如果提供了 currentStock，則更新庫存
    if (currentStock !== undefined && currentStock !== null && currentStock !== '') {
      updateData.currentStock = Number(currentStock) || 0;
      updateData.lastStockUpdate = FieldValue.serverTimestamp();
    }
    
    if (supplierId) { 
      updateData.supplierRef = db.collection("suppliers").doc(supplierId); 
    } else { 
      updateData.supplierRef = FieldValue.delete(); 
    }
    
    await fragranceDoc.ref.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功根據編號更新香精資料: ${code} (ID: ${fragranceId})`);
    return { status: "success", message: `香精 ${name} (編號: ${code}) 的資料已成功更新。`, fragranceId };
  } catch (error) { 
    logger.error(`根據編號更新香精 ${code} 時發生錯誤:`, error); 
    throw new HttpsError("internal", "更新香精資料時發生未知錯誤。"); 
  }
});

export const deleteFragrance = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureIsAdmin(contextAuth?.uid);
  const { fragranceId } = data;
  if (!fragranceId) { throw new HttpsError("invalid-argument", "請求缺少 fragranceId。"); }
  try {
    await db.collection("fragrances").doc(fragranceId).delete();
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除香精: ${fragranceId}`);
    return { status: "success", message: "香精已成功刪除。", };
  } catch (error) { logger.error(`刪除香精 ${fragranceId} 時發生錯誤:`, error); throw new HttpsError("internal", "刪除香精時發生未知錯誤。"); }
});
