// functions/src/api/fragrances.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

interface FragranceData {
  code: string; 
  name: string; 
  status: string; 
  fragranceType?: string;
  coreType: string; 
  currentStock: number; 
  safetyStockLevel: number; 
  costPerUnit: number; 
  percentage: number; 
  pgRatio: number; 
  vgRatio: number; 
  unit?: string;
  lastStockUpdate?: FieldValue; 
  createdAt: FieldValue; 
  updatedAt: FieldValue; 
  supplierRef?: DocumentReference | FieldValue;
}

export const createFragrance = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { code, name, status, fragranceType, supplierId, coreType, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
  if (!code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (代號、名稱)。"); }
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType || status || 'cotton';
  const finalStatus = status || fragranceType || 'active';
  
  try {
    const newFragrance: FragranceData = { 
      code, 
      name, 
      status: finalStatus, 
      fragranceType: finalFragranceType,
      coreType: coreType || "", 
      currentStock: 0, 
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      percentage: Number(percentage) || 0, 
      pgRatio: Number(pgRatio) || 0, 
      vgRatio: Number(vgRatio) || 0, 
      unit: unit || 'KG',
      createdAt: FieldValue.serverTimestamp(), 
      updatedAt: FieldValue.serverTimestamp(), 
    };
    if (supplierId) { newFragrance.supplierRef = db.collection("suppliers").doc(supplierId); }
    const docRef = await db.collection("fragrances").add(newFragrance);
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新香精: ${docRef.id}`);
    return { status: "success", message: `香精 ${name} 已成功建立。`, fragranceId: docRef.id, };
  } catch (error) { logger.error("建立香精時發生錯誤:", error); throw new HttpsError("internal", "建立香精時發生未知錯誤。"); }
});

export const updateFragrance = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { fragranceId, code, name, status, fragranceType, supplierId, coreType, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
  if (!fragranceId || !code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (ID, 代號、名稱)。"); }
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType || status || 'cotton';
  const finalStatus = status || fragranceType || 'active';
  
  try {
    const fragranceRef = db.collection("fragrances").doc(fragranceId);
    const updateData: Partial<FragranceData> = { 
      code, 
      name, 
      status: finalStatus, 
      fragranceType: finalFragranceType,
      coreType: coreType || "", 
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      percentage: Number(percentage) || 0, 
      pgRatio: Number(pgRatio) || 0, 
      vgRatio: Number(vgRatio) || 0, 
      unit: unit || 'KG',
      updatedAt: FieldValue.serverTimestamp(), 
    };
    if (supplierId) { updateData.supplierRef = db.collection("suppliers").doc(supplierId); } else { updateData.supplierRef = FieldValue.delete(); }
    await fragranceRef.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功更新香精資料: ${fragranceId}`);
    return { status: "success", message: `香精 ${name} 的資料已成功更新。`, };
  } catch (error) { logger.error(`更新香精 ${fragranceId} 時發生錯誤:`, error); throw new HttpsError("internal", "更新香精資料時發生未知錯誤。"); }
});

export const updateFragranceByCode = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { code, name, status, fragranceType, supplierId, coreType, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
  if (!code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (代號、名稱)。"); }
  
  // 處理 fragranceType 和 status 的相容性
  const finalFragranceType = fragranceType || status || 'cotton';
  const finalStatus = status || fragranceType || 'active';
  
  try {
    // 根據香精編號查找現有的香精
    const fragranceQuery = await db.collection("fragrances").where("code", "==", code).limit(1).get();
    
    if (fragranceQuery.empty) {
      throw new HttpsError("not-found", `找不到香精編號為 ${code} 的香精。`);
    }
    
    const fragranceDoc = fragranceQuery.docs[0];
    const fragranceId = fragranceDoc.id;
    
    const updateData: Partial<FragranceData> = { 
      code, 
      name, 
      status: finalStatus, 
      fragranceType: finalFragranceType,
      coreType: coreType || "", 
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      percentage: Number(percentage) || 0, 
      pgRatio: Number(pgRatio) || 0, 
      vgRatio: Number(vgRatio) || 0, 
      unit: unit || 'KG',
      updatedAt: FieldValue.serverTimestamp(), 
    };
    if (supplierId) { updateData.supplierRef = db.collection("suppliers").doc(supplierId); } else { updateData.supplierRef = FieldValue.delete(); }
    
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
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { fragranceId } = data;
  if (!fragranceId) { throw new HttpsError("invalid-argument", "請求缺少 fragranceId。"); }
  try {
    await db.collection("fragrances").doc(fragranceId).delete();
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除香精: ${fragranceId}`);
    return { status: "success", message: "香精已成功刪除。", };
  } catch (error) { logger.error(`刪除香精 ${fragranceId} 時發生錯誤:`, error); throw new HttpsError("internal", "刪除香精時發生未知錯誤。"); }
});
