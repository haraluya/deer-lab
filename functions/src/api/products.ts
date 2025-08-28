// functions/src/api/products.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureCanManageProducts } from "../utils/auth";

const db = getFirestore();

export const createProduct = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureCanManageProducts(contextAuth?.uid);
  const { name, seriesId, fragranceId, nicotineMg, concentration, specificMaterialIds, status } = data;
  if (!name || !seriesId || !fragranceId || !status) { throw new HttpsError("invalid-argument", "請求缺少產品名稱、系列、香精或狀態。"); }
  const seriesRef = db.doc(`productSeries/${seriesId}`);
  const seriesDoc = await seriesRef.get();
  if (!seriesDoc.exists) { throw new HttpsError("not-found", "指定的產品系列不存在"); }
  const seriesData = seriesDoc.data();
  const seriesCode = seriesData?.code;
  const productType = seriesData?.productType;
  const productCode = await db.runTransaction(async (transaction) => {
    const counterRef = db.doc(`counters/product_${seriesId}`);
    const counterDoc = await transaction.get(counterRef);
    let newCount = 1;
    if (counterDoc.exists) { newCount = (counterDoc.data()?.count || 0) + 1; }
    transaction.set(counterRef, { count: newCount }, { merge: true });
    const sequenceNumber = String(newCount).padStart(3, '0');
    return `${productType}-${seriesCode}-${sequenceNumber}`;
  });
  const fragranceRef = db.doc(`fragrances/${fragranceId}`);
  const materialRefs = (specificMaterialIds || []).map((id: string) => db.doc(`materials/${id}`));
  await db.collection("products").add({ name, code: productCode, seriesRef, currentFragranceRef: fragranceRef, nicotineMg: Number(nicotineMg) || 0, concentration: Number(concentration) || 0, specificMaterials: materialRefs, status, createdAt: FieldValue.serverTimestamp(), });
  return { success: true, code: productCode };
});

export const updateProduct = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureCanManageProducts(contextAuth?.uid);
  const { productId, name, fragranceId, nicotineMg, concentration, specificMaterialIds, status } = data;
  if (!productId) { throw new HttpsError("invalid-argument", "缺少 productId"); }
  const productRef = db.doc(`products/${productId}`);
  const fragranceRef = db.doc(`fragrances/${fragranceId}`);
  const materialRefs = (specificMaterialIds || []).map((id: string) => db.doc(`materials/${id}`));
  await productRef.update({ name, currentFragranceRef: fragranceRef, nicotineMg: Number(nicotineMg) || 0, concentration: Number(concentration) || 0, specificMaterials: materialRefs, status, updatedAt: FieldValue.serverTimestamp(), });
  return { success: true };
});

export const deleteProduct = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureCanManageProducts(contextAuth?.uid);
  const { productId } = data;
  if (!productId) { throw new HttpsError("invalid-argument", "缺少 productId"); }
  await db.doc(`products/${productId}`).delete();
  return { success: true };
});

export const changeProductFragrance = onCall(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { productId, newFragranceId, reason } = data;
    if (!productId || !newFragranceId || !reason) { throw new HttpsError("invalid-argument", "請求缺少 productId, newFragranceId, 或 reason。"); }
    const productRef = db.doc(`products/${productId}`);
    const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
    const changedByRef = db.doc(`users/${contextAuth?.uid}`);
    try {
        await db.runTransaction(async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) { throw new HttpsError("not-found", "找不到指定的產品。"); }
            const oldFragranceRef = productDoc.data()?.currentFragranceRef;
            transaction.update(productRef, { currentFragranceRef: newFragranceRef, updatedAt: FieldValue.serverTimestamp(), });
            const historyRef = productRef.collection("fragranceHistory").doc();
            transaction.set(historyRef, { oldFragranceRef: oldFragranceRef || null, newFragranceRef: newFragranceRef, reason: reason, changedAt: FieldValue.serverTimestamp(), changedByRef: changedByRef, });
        });
        logger.info(`管理員 ${contextAuth?.uid} 成功更換產品 ${productId} 的香精。`);
        return { success: true, message: "香精更換成功並已記錄。" };
    } catch (error) {
        logger.error(`更換產品 ${productId} 香精時發生錯誤:`, error);
        if (error instanceof HttpsError) { throw error; }
        throw new HttpsError("internal", "更換香精時發生未知錯誤。");
    }
});
