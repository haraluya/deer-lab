// functions/src/api/materials.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { ensureCanManageMaterials } from "../utils/auth";

const db = getFirestore();

interface MaterialData {
  code: string; name: string; category: string; subCategory: string; safetyStockLevel: number; costPerUnit: number; unit: string; currentStock?: number; createdAt?: FieldValue; updatedAt: FieldValue; supplierRef?: DocumentReference | FieldValue;
}

export const createMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureCanManageMaterials(contextAuth?.uid);
  const { code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit } = data;
  if (!code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (物料代號、物料名稱)。"); }
  try {
    const newMaterial: MaterialData = { code, name, category: category || "", subCategory: subCategory || "", safetyStockLevel: Number(safetyStockLevel) || 0, costPerUnit: Number(costPerUnit) || 0, unit: unit || "", currentStock: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), };
    if (supplierId) { newMaterial.supplierRef = db.collection("suppliers").doc(supplierId); }
    const docRef = await db.collection("materials").add(newMaterial);
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新物料: ${docRef.id}`);
    return { status: "success", message: `物料 ${name} 已成功建立。`, materialId: docRef.id, };
  } catch (error) { logger.error("建立物料時發生錯誤:", error); throw new HttpsError("internal", "建立物料時發生未知錯誤。"); }
});

export const updateMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureCanManageMaterials(contextAuth?.uid);
  const { materialId, code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit } = data;
  if (!materialId || !code || !name) { throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (materialId, code, name)。"); }
  try {
    const materialRef = db.collection("materials").doc(materialId);
    const updateData: Partial<MaterialData> = { code, name, category: category || "", subCategory: subCategory || "", safetyStockLevel: Number(safetyStockLevel) || 0, costPerUnit: Number(costPerUnit) || 0, unit: unit || "", updatedAt: FieldValue.serverTimestamp(), };
    if (supplierId) { updateData.supplierRef = db.collection("suppliers").doc(supplierId); } else { updateData.supplierRef = FieldValue.delete(); }
    await materialRef.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功更新物料資料: ${materialId}`);
    return { status: "success", message: `物料 ${name} 的資料已成功更新。`, };
  } catch (error) { logger.error(`更新物料 ${materialId} 時發生錯誤:`, error); throw new HttpsError("internal", "更新物料資料時發生未知錯誤。"); }
});

export const deleteMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureCanManageMaterials(contextAuth?.uid);
  const { materialId } = data;
  if (!materialId) { throw new HttpsError("invalid-argument", "請求缺少 materialId。"); }
  try {
    await db.collection("materials").doc(materialId).delete();
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除物料: ${materialId}`);
    return { status: "success", message: "物料已成功刪除。", };
  } catch (error) { logger.error(`刪除物料 ${materialId} 時發生錯誤:`, error); throw new HttpsError("internal", "刪除物料時發生未知錯誤。"); }
});
