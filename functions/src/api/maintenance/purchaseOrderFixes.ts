// functions/src/api/maintenance/purchaseOrderFixes.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 修復採購單項目的 itemRef 和 type 欄位
 * 針對在修復前建立的採購單，其 itemRef 可能指向錯誤的 collection
 */
export const fixPurchaseOrderItemRefs = onCall(async (request) => {
  const { auth: contextAuth, data } = request;

  if (!contextAuth) {
    throw new HttpsError("unauthenticated", "未登入");
  }

  // 檢查權限（僅管理員可使用）
  const userDoc = await db.collection("users").doc(contextAuth.uid).get();
  const userData = userDoc.data();
  const userRole = userData?.role || "employee";

  if (userRole !== "admin") {
    throw new HttpsError("permission-denied", "僅限管理員使用此功能");
  }

  const { purchaseOrderId, dryRun = true } = data;

  if (!purchaseOrderId) {
    throw new HttpsError("invalid-argument", "缺少採購單 ID");
  }

  try {
    const poRef = db.collection("purchaseOrders").doc(purchaseOrderId);
    const poDoc = await poRef.get();

    if (!poDoc.exists) {
      throw new HttpsError("not-found", "找不到採購單");
    }

    const poData = poDoc.data()!;
    const items = poData.items || [];

    if (items.length === 0) {
      return {
        success: true,
        message: "採購單沒有項目，無需修復",
        fixed: 0,
        details: []
      };
    }

    const fixDetails: any[] = [];
    let fixedCount = 0;

    // 分析每個項目
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 判斷應該是什麼類型
      // 香精：無 unit 或 unit 為 KG/kg
      // 原料：有特定單位（L、ML、G、PC 等）
      const shouldBeFragrance = !item.unit || (item.unit && item.unit.toUpperCase() === 'KG');
      const expectedType = shouldBeFragrance ? 'fragrance' : 'material';
      const expectedCollection = shouldBeFragrance ? 'fragrances' : 'materials';

      // 提取當前 itemRef 路徑
      let currentCollection = 'unknown';
      let itemId = '';

      if (item.itemRef) {
        if (item.itemRef._key && item.itemRef._key.path && item.itemRef._key.path.segments) {
          const segments = item.itemRef._key.path.segments;
          const documentsIndex = segments.indexOf('documents');
          if (documentsIndex !== -1 && documentsIndex + 2 < segments.length) {
            currentCollection = segments[documentsIndex + 1];
            itemId = segments[documentsIndex + 2];
          }
        } else if (item.itemRef.path) {
          const pathParts = item.itemRef.path.split('/');
          if (pathParts.length >= 2) {
            currentCollection = pathParts[pathParts.length - 2];
            itemId = pathParts[pathParts.length - 1];
          }
        }
      }

      // 檢查是否需要修復
      const needsTypeField = !item.type;
      const needsRefFix = currentCollection !== 'unknown' && currentCollection !== expectedCollection;

      if (needsTypeField || needsRefFix) {
        fixDetails.push({
          index: i,
          code: item.code,
          name: item.name,
          unit: item.unit,
          currentType: item.type || '無',
          expectedType: expectedType,
          currentCollection: currentCollection,
          expectedCollection: expectedCollection,
          needsTypeField: needsTypeField,
          needsRefFix: needsRefFix,
          itemId: itemId
        });

        fixedCount++;

        // 如果不是 dry run，執行修復
        if (!dryRun && itemId) {
          // 更新項目的 type 和 itemRef
          items[i] = {
            ...item,
            type: expectedType,
            itemRef: db.doc(`${expectedCollection}/${itemId}`)
          };
        }
      } else {
        fixDetails.push({
          index: i,
          code: item.code,
          name: item.name,
          unit: item.unit,
          status: '✅ 正確，無需修復',
          currentType: item.type,
          currentCollection: currentCollection
        });
      }
    }

    // 如果不是 dry run 且有修復項目，更新文檔
    if (!dryRun && fixedCount > 0) {
      await poRef.update({
        items: items,
        fixedAt: FieldValue.serverTimestamp(),
        fixedBy: contextAuth.uid,
        fixedByName: contextAuth.token?.name || '未知管理員'
      });

      logger.info(`管理員 ${contextAuth.uid} 修復了採購單 ${purchaseOrderId} 的 ${fixedCount} 個項目`);
    }

    return {
      success: true,
      message: dryRun
        ? `分析完成，發現 ${fixedCount} 個需要修復的項目`
        : `成功修復 ${fixedCount} 個項目`,
      dryRun: dryRun,
      purchaseOrderId: purchaseOrderId,
      purchaseOrderCode: poData.code,
      totalItems: items.length,
      needsFix: fixedCount,
      details: fixDetails
    };

  } catch (error) {
    logger.error("修復採購單項目失敗:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "修復採購單項目失敗");
  }
});

/**
 * 批量掃描所有採購單，找出需要修復的
 */
export const scanAllPurchaseOrders = onCall(async (request) => {
  const { auth: contextAuth } = request;

  if (!contextAuth) {
    throw new HttpsError("unauthenticated", "未登入");
  }

  // 檢查權限（僅管理員可使用）
  const userDoc = await db.collection("users").doc(contextAuth.uid).get();
  const userData = userDoc.data();
  const userRole = userData?.role || "employee";

  if (userRole !== "admin") {
    throw new HttpsError("permission-denied", "僅限管理員使用此功能");
  }

  try {
    const poSnapshot = await db.collection("purchaseOrders")
      .orderBy("createdAt", "desc")
      .limit(100)  // 限制掃描最近100個採購單
      .get();

    const problematicPOs: any[] = [];

    for (const poDoc of poSnapshot.docs) {
      const poData = poDoc.data();
      const items = poData.items || [];

      let hasProblems = false;
      const problems: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 判斷應該是什麼類型
        const shouldBeFragrance = !item.unit || (item.unit && item.unit.toUpperCase() === 'KG');
        const expectedCollection = shouldBeFragrance ? 'fragrances' : 'materials';

        // 提取當前 itemRef 路徑
        let currentCollection = 'unknown';
        if (item.itemRef) {
          if (item.itemRef._key && item.itemRef._key.path && item.itemRef._key.path.segments) {
            const segments = item.itemRef._key.path.segments;
            const documentsIndex = segments.indexOf('documents');
            if (documentsIndex !== -1 && documentsIndex + 2 < segments.length) {
              currentCollection = segments[documentsIndex + 1];
            }
          }
        }

        // 檢查問題
        const needsTypeField = !item.type;
        const needsRefFix = currentCollection !== 'unknown' && currentCollection !== expectedCollection;

        if (needsTypeField || needsRefFix) {
          hasProblems = true;
          problems.push({
            itemIndex: i,
            code: item.code,
            name: item.name,
            needsTypeField: needsTypeField,
            needsRefFix: needsRefFix,
            expectedCollection: expectedCollection,
            currentCollection: currentCollection
          });
        }
      }

      if (hasProblems) {
        problematicPOs.push({
          id: poDoc.id,
          code: poData.code,
          status: poData.status,
          createdAt: poData.createdAt?.toDate?.()?.toISOString() || '未知',
          problemCount: problems.length,
          problems: problems
        });
      }
    }

    return {
      success: true,
      scannedCount: poSnapshot.size,
      problematicCount: problematicPOs.length,
      problematicPurchaseOrders: problematicPOs
    };

  } catch (error) {
    logger.error("掃描採購單失敗:", error);
    throw new HttpsError("internal", "掃描採購單失敗");
  }
});
