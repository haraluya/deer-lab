// functions/src/api/suppliers.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

export const createSupplier = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
  if (!name) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (供應商名稱)。"); 
  }
  try {
    const newSupplier = { 
      name, 
      products: products || "", 
      contactWindow: contactWindow || "", 
      contactMethod: contactMethod || "", 
      liaisonPersonId: liaisonPersonId || "", 
      notes: notes || "", 
      createdAt: FieldValue.serverTimestamp(), 
      updatedAt: FieldValue.serverTimestamp(), 
    };
    const docRef = await db.collection("suppliers").add(newSupplier);
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新供應商: ${docRef.id}`);
    return { 
      status: "success", 
      message: `供應商 ${name} 已成功建立。`, 
      supplierId: docRef.id, 
    };
  } catch (error) { 
    logger.error("建立供應商時發生錯誤:", error); 
    throw new HttpsError("internal", "建立供應商時發生未知錯誤。"); 
  }
});

export const updateSupplier = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { supplierId, name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
  if (!supplierId || !name) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (supplierId, name)。"); 
  }
  try {
    const supplierRef = db.collection("suppliers").doc(supplierId);
    const updateData = { 
      name, 
      products: products || "", 
      contactWindow: contactWindow || "", 
      contactMethod: contactMethod || "", 
      liaisonPersonId: liaisonPersonId || "", 
      notes: notes || "", 
      updatedAt: FieldValue.serverTimestamp(), 
    };
    await supplierRef.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功更新供應商資料: ${supplierId}`);
    return { 
      status: "success", 
      message: `供應商 ${name} 的資料已成功更新。`, 
    };
  } catch (error) { 
    logger.error(`更新供應商 ${supplierId} 時發生錯誤:`, error); 
    throw new HttpsError("internal", "更新供應商資料時發生未知錯誤。"); 
  }
});

export const deleteSupplier = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureIsAdmin(contextAuth?.uid);
  const { supplierId } = data;
  if (!supplierId) { 
    throw new HttpsError("invalid-argument", "請求缺少 supplierId。"); 
  }
  try {
    await db.collection("suppliers").doc(supplierId).delete();
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除供應商: ${supplierId}`);
    return { 
      status: "success", 
      message: "供應商已成功刪除。", 
    };
  } catch (error) { 
    logger.error(`刪除供應商 ${supplierId} 時發生錯誤:`, error); 
    throw new HttpsError("internal", "刪除供應商時發生未知錯誤。"); 
  }
});
