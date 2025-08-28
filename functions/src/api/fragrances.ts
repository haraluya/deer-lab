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
    const finalFragranceType = fragranceType || status || 'cotton';
    const finalStatus = status || fragranceType || 'active';
    const finalFragranceStatus = fragranceStatus || 'active';

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
  const { fragranceId, code, name, status, fragranceType, fragranceStatus, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
  if (!fragranceId || !code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (ID, 代號、名稱)。"); }
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType || status || 'cotton';
  const finalStatus = status || fragranceType || 'active';
  const finalFragranceStatus = fragranceStatus || status || 'active';
  
  try {
    const fragranceRef = db.collection("fragrances").doc(fragranceId);
    const updateData: any = { 
      code, 
      name, 
      status: finalStatus, 
      fragranceType: finalFragranceType,
      fragranceStatus: finalFragranceStatus,
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
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType || status || 'cotton';
  const finalStatus = status || fragranceType || 'active';
  const finalFragranceStatus = fragranceStatus || status || 'active';
  
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
      fragranceType: finalFragranceType,
      fragranceStatus: finalFragranceStatus,
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      percentage: Number(percentage) || 0, 
      pgRatio: Number(pgRatio) || 0, 
      vgRatio: Number(vgRatio) || 0, 
      unit: unit || 'KG',
      updatedAt: FieldValue.serverTimestamp(), 
    };
    
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
