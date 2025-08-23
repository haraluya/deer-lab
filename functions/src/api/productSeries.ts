// functions/src/api/productSeries.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

export const createProductSeries = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureIsAdmin(contextAuth?.uid);
  const { name, code, commonMaterialIds } = data;
  if (!name || !code) { throw new HttpsError("invalid-argument", "請求缺少系列名稱或系列代號。"); }
  try {
    const materialRefs = (commonMaterialIds || []).map((id: string) => db.collection("materials").doc(id));
    const newSeries = { name, code, commonMaterials: materialRefs, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), };
    const docRef = await db.collection("productSeries").add(newSeries);
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新產品系列: ${docRef.id}`);
    return { status: "success", message: `產品系列 ${name} 已成功建立。` };
  } catch (error) { logger.error("建立產品系列時發生錯誤:", error); throw new HttpsError("internal", "建立產品系列時發生未知錯誤。"); }
});

export const updateProductSeries = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureIsAdmin(contextAuth?.uid);
  const { seriesId, name, code, commonMaterialIds } = data;
  if (!seriesId || !name || !code) { throw new HttpsError("invalid-argument", "請求缺少系列 ID、名稱或代號。"); }
  try {
    const materialRefs = (commonMaterialIds || []).map((id: string) => db.collection("materials").doc(id));
    const seriesRef = db.collection("productSeries").doc(seriesId);
    await seriesRef.update({ name, code, commonMaterials: materialRefs, updatedAt: FieldValue.serverTimestamp(), });
    logger.info(`管理員 ${contextAuth?.uid} 成功更新產品系列: ${seriesId}`);
    return { status: "success", message: `產品系列 ${name} 已成功更新。` };
  } catch (error) { logger.error(`更新產品系列 ${seriesId} 時發生錯誤:`, error); throw new HttpsError("internal", "更新產品系列時發生未知錯誤。"); }
});

export const deleteProductSeries = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureIsAdmin(contextAuth?.uid);
  const { seriesId } = data;
  if (!seriesId) { throw new HttpsError("invalid-argument", "請求缺少 seriesId。"); }
  try {
    await db.collection("productSeries").doc(seriesId).delete();
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除產品系列: ${seriesId}`);
    return { status: "success", message: "產品系列已成功刪除。" };
  } catch (error) { logger.error(`刪除產品系列 ${seriesId} 時發生錯誤:`, error); throw new HttpsError("internal", "刪除產品系列時發生未知錯誤。"); }
});
