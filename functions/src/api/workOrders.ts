// functions/src/api/workOrders.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { ensureIsAdminOrForeman } from "../utils/auth";

const db = getFirestore();

interface MaterialInfo {
  itemRef: DocumentReference;
  name: string;
  code: string;
  unit: string;
  quantity: number;
}

/**
 * Creates a new work order based on a product and target quantity.
 */
export const createWorkOrder = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // 暫時移除權限檢查
  // await ensureIsAdminOrForeman(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { productId, targetQuantity } = data;
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

    // 2. Fetch all required data
    const productRef = db.doc(`products/${productId}`);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      throw new HttpsError("not-found", "找不到指定的產品。");
    }
    const productData = productSnap.data()!;

    // 3. Build Bill of Materials (BOM)
    const billOfMaterials: MaterialInfo[] = [];

    // --- Fragrance and its components (PG/VG) ---
    if (productData.currentFragranceRef) {
      const fragranceSnap = await productData.currentFragranceRef.get();
      if (fragranceSnap.exists) {
        const fragranceData = fragranceSnap.data()!;
        const totalFragranceQty = (fragranceData.percentage / 100) * targetQuantity;
        
        billOfMaterials.push({
          itemRef: productData.currentFragranceRef,
          name: fragranceData.name,
          code: fragranceData.code,
          unit: 'g', // Assuming grams for fragrance
          quantity: parseFloat(totalFragranceQty.toFixed(3)),
        });

        // Add PG and VG if they exist
        const pgRatio = fragranceData.pgRatio || 0;
        const vgRatio = fragranceData.vgRatio || 0;

        if (pgRatio > 0) {
            const pgMaterialSnap = await db.collection('materials').where('name', '==', 'PG').limit(1).get();
            if (!pgMaterialSnap.empty) {
                const pgDoc = pgMaterialSnap.docs[0];
                billOfMaterials.push({
                    itemRef: pgDoc.ref,
                    name: 'PG',
                    code: pgDoc.data().code,
                    unit: 'g',
                    quantity: parseFloat(((pgRatio / 100) * targetQuantity).toFixed(3)),
                });
            }
        }
        if (vgRatio > 0) {
            const vgMaterialSnap = await db.collection('materials').where('name', '==', 'VG').limit(1).get();
            if (!vgMaterialSnap.empty) {
                const vgDoc = vgMaterialSnap.docs[0];
                billOfMaterials.push({
                    itemRef: vgDoc.ref,
                    name: 'VG',
                    code: vgDoc.data().code,
                    unit: 'g',
                    quantity: parseFloat(((vgRatio / 100) * targetQuantity).toFixed(3)),
                });
            }
        }
      }
    }
    
    // --- Nicotine ---
    if (productData.nicotineMg && productData.nicotineMg > 0) {
        const nicotineMaterialSnap = await db.collection('materials').where('name', '==', 'Nicotine').limit(1).get();
        if(!nicotineMaterialSnap.empty) {
            const nicotineDoc = nicotineMaterialSnap.docs[0];
            billOfMaterials.push({
                itemRef: nicotineDoc.ref,
                name: 'Nicotine',
                code: nicotineDoc.data().code,
                unit: 'g',
                quantity: parseFloat(((productData.nicotineMg / 10) * targetQuantity).toFixed(3)), // Assuming mg/ml, so mg * target_ml / 1000 -> g
            });
        }
    }

    // 4. Create the work order document
    const workOrderRef = db.collection("workOrders").doc();
    await workOrderRef.set({
      code: woCode,
      productRef: productRef,
      productSnapshot: {
        code: productData.code,
        name: productData.name,
        fragranceName: (await productData.currentFragranceRef?.get())?.data()?.name || 'N/A',
        nicotineMg: productData.nicotineMg || 0,
      },
      billOfMaterials: billOfMaterials,
      targetQuantity: targetQuantity,
      actualQuantity: 0,
      status: "未確認",
      qcStatus: "未檢驗",
      createdAt: FieldValue.serverTimestamp(),
      createdByRef: createdByRef,
    });
    
    logger.info(`使用者 ${contextAuth.uid} 成功建立了工單 ${woCode} (ID: ${workOrderRef.id})`);
    return { success: true, workOrderId: workOrderRef.id, workOrderCode: woCode };

  } catch (error) {
    logger.error(`建立工單時發生嚴重錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "建立工單時發生未知錯誤。");
  }
});
