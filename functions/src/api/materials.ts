// functions/src/api/materials.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { ensureCanManageMaterials } from "../utils/auth";

const db = getFirestore();

interface MaterialData {
  code: string; 
  name: string; 
  category: string; 
  subCategory: string; 
  mainCategoryId?: string; // 新增：主分類ID
  subCategoryId?: string;  // 新增：細分分類ID
  safetyStockLevel: number; 
  costPerUnit: number; 
  unit: string; 
  currentStock?: number; 
  createdAt?: FieldValue; 
  updatedAt: FieldValue; 
  supplierRef?: DocumentReference | FieldValue;
  notes?: string;
}

// 生成 4 位隨機數字
function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 生成 2 位大寫英文字母 ID (主分類)
function generateCategoryId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

// 生成 3 位數字 ID (細分分類)
function generateSubCategoryId(): string {
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 新的物料代號生成：主分類ID(2位字母) + 細分分類ID(3位數字) + 隨機生成碼(4位數字) = 9碼
function generateMaterialCode(mainCategoryId: string, subCategoryId: string, randomCode?: string): string {
  // 確保主分類ID是2位字母
  const categoryId = mainCategoryId ? mainCategoryId.substring(0, 2).toUpperCase() : 'XX';
  
  // 確保細分分類ID是3位數字
  const subCategoryIdStr = subCategoryId ? subCategoryId.padStart(3, '0').substring(0, 3) : '000';
  
  // 生成或使用現有的隨機生成碼
  const randomPart = randomCode || generateRandomCode();
  
  return `${categoryId}${subCategoryIdStr}${randomPart}`;
}

// 從物料代號中提取各部分
function parseMaterialCode(code: string): {
  mainCategoryId: string;
  subCategoryId: string;
  randomCode: string;
} {
  if (code.length !== 9) {
    throw new Error('物料代號必須是9位');
  }
  
  return {
    mainCategoryId: code.substring(0, 2), // 前2位是主分類ID
    subCategoryId: code.substring(2, 5),  // 中間3位是細分分類ID
    randomCode: code.substring(5, 9)      // 後4位是隨機生成碼
  };
}

// 更新物料代號（當分類改變時，保持隨機生成碼不變）
function updateMaterialCode(oldCode: string, newMainCategoryId: string, newSubCategoryId: string): string {
  try {
    const { randomCode } = parseMaterialCode(oldCode);
    return generateMaterialCode(newMainCategoryId, newSubCategoryId, randomCode);
  } catch (error) {
    // 如果解析失敗，生成新的完整代號
    return generateMaterialCode(newMainCategoryId, newSubCategoryId);
  }
}

// Helper to generate a unique material code against a set of existing codes
function generateUniqueMaterialCode(
  mainCategoryId: string,
  subCategoryId: string,
  existingCodes: Set<string>
): string {
  let code = generateMaterialCode(mainCategoryId, subCategoryId);
  let attempts = 0;
  const maxAttempts = 10;

  while (existingCodes.has(code) && attempts < maxAttempts) {
    code = generateMaterialCode(mainCategoryId, subCategoryId);
    attempts++;
  }

  // If we still have a collision, add a timestamp suffix
  if (existingCodes.has(code)) {
    const timestamp = Date.now().toString().slice(-6);
    code = `${code.substring(0, 3)}_${timestamp}`;
  }

  return code;
}

// 自動生成分類和子分類（包含ID）
async function autoGenerateCategories(materialData: any) {
  // 如果沒有分類，自動生成
  if (!materialData.category) {
    const categoryName = '自動分類_' + Math.floor(Math.random() * 1000);
    const categoryId = generateCategoryId();
    
    await db.collection('materialCategories').add({
      name: categoryName,
      id: categoryId,
      type: 'category',
      createdAt: FieldValue.serverTimestamp()
    });
    
    materialData.category = categoryName;
    materialData.mainCategoryId = categoryId;
    logger.info('自動生成主分類:', categoryName, 'ID:', categoryId);
  }
  
  // 如果沒有子分類，自動生成
  if (!materialData.subCategory) {
    const subCategoryName = '自動子分類_' + Math.floor(Math.random() * 1000);
    const subCategoryId = generateSubCategoryId();
    
    await db.collection('materialSubCategories').add({
      name: subCategoryName,
      id: subCategoryId,
      type: 'subCategory',
      parentCategory: materialData.category,
      createdAt: FieldValue.serverTimestamp()
    });
    
    materialData.subCategory = subCategoryName;
    materialData.subCategoryId = subCategoryId;
    logger.info('自動生成子分類:', subCategoryName, 'ID:', subCategoryId);
  }
  
  return materialData;
}

// 獲取或創建分類ID
async function getOrCreateCategoryId(categoryName: string, type: 'category' | 'subCategory'): Promise<string> {
  try {
    const collectionName = type === 'category' ? 'materialCategories' : 'materialSubCategories';
    const query = await db.collection(collectionName)
      .where('name', '==', categoryName)
      .get();
    
    if (!query.empty) {
      const doc = query.docs[0];
      return doc.data().id || (type === 'category' ? generateCategoryId() : generateSubCategoryId());
    }
    
    // 如果不存在，創建新的
    const newId = type === 'category' ? generateCategoryId() : generateSubCategoryId();
    await db.collection(collectionName).add({
      name: categoryName,
      id: newId,
      type: type,
      createdAt: FieldValue.serverTimestamp()
    });
    
    return newId;
  } catch (error) {
    logger.error(`獲取或創建${type}ID時發生錯誤:`, error);
    return type === 'category' ? generateCategoryId() : generateSubCategoryId();
  }
}

export const createMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  const { code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit, notes } = data;
  
  if (!name) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (物料名稱)。"); 
  }

  try {
    // 自動生成分類和子分類（如果沒有提供）
    let processedData = { ...data };
    if (!category || !subCategory) {
      processedData = await autoGenerateCategories(processedData);
    }

    // 獲取分類ID
    const mainCategoryId = await getOrCreateCategoryId(processedData.category, 'category');
    const subCategoryId = await getOrCreateCategoryId(processedData.subCategory, 'subCategory');

    // 如果沒有提供代號，自動生成
    let finalCode = code;
    if (!finalCode) {
      finalCode = generateUniqueMaterialCode(mainCategoryId, subCategoryId, new Set());
    }

    const newMaterial: MaterialData = { 
      code: finalCode, 
      name, 
      category: processedData.category || "", 
      subCategory: processedData.subCategory || "", 
      mainCategoryId,
      subCategoryId,
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      unit: unit || "", 
      currentStock: 0, 
      notes: notes || "",
      createdAt: FieldValue.serverTimestamp(), 
      updatedAt: FieldValue.serverTimestamp(), 
    };
    
    if (supplierId) { 
      newMaterial.supplierRef = db.collection("suppliers").doc(supplierId); 
    }
    
    const docRef = await db.collection("materials").add(newMaterial);
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新物料: ${docRef.id}`);
    
    return { 
      status: "success", 
      message: `物料 ${name} 已成功建立。`, 
      materialId: docRef.id,
      generatedCode: finalCode
    };
  } catch (error) { 
    logger.error("建立物料時發生錯誤:", error); 
    throw new HttpsError("internal", "建立物料時發生未知錯誤。"); 
  }
});

export const updateMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  logger.info(`開始更新物料，接收到的資料:`, data);
  
  const { materialId, name, category, subCategory, supplierId, currentStock, safetyStockLevel, costPerUnit, unit, notes } = data;
  
  if (!materialId || !name) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (materialId, name)。"); 
  }
  
  try {
    const materialRef = db.collection("materials").doc(materialId);
    const materialDoc = await materialRef.get();

    if (!materialDoc.exists) {
      throw new HttpsError("not-found", "物料不存在。");
    }

    const currentMaterial = materialDoc.data() as MaterialData;
    let updatedCode = currentMaterial.code;

    // 如果分類有改變，更新物料代號
    if (category !== currentMaterial.category || subCategory !== currentMaterial.subCategory) {
      const newMainCategoryId = await getOrCreateCategoryId(category, 'category');
      const newSubCategoryId = await getOrCreateCategoryId(subCategory, 'subCategory');
      
      // 保持隨機生成碼不變，只更新分類部分
      updatedCode = updateMaterialCode(currentMaterial.code, newMainCategoryId, newSubCategoryId);
      
      logger.info(`物料 ${materialId} 分類改變，更新代號從 ${currentMaterial.code} 到 ${updatedCode}`);
    }

    // 檢查庫存是否有變更
    const oldStock = currentMaterial.currentStock || 0;
    const newStock = Number(currentStock) || 0;
    const stockChanged = oldStock !== newStock;
    
    logger.info(`庫存變更檢查:`, {
      materialId,
      oldStock,
      newStock,
      stockChanged,
      oldStockType: typeof oldStock,
      newStockType: typeof newStock,
      currentStockParam: currentStock,
      currentStockParamType: typeof currentStock
    });

    const updateData: Partial<MaterialData> = {
      name,
      category: category || "",
      subCategory: subCategory || "",
      code: updatedCode,
      currentStock: Number(currentStock) || 0,
      safetyStockLevel: Number(safetyStockLevel) || 0,
      costPerUnit: Number(costPerUnit) || 0,
      unit: unit || "",
      notes: notes || "",
      updatedAt: FieldValue.serverTimestamp(),
    };

    logger.info(`準備更新的資料:`, updateData);

    if (supplierId) {
      updateData.supplierRef = db.collection("suppliers").doc(supplierId);
    } else {
      updateData.supplierRef = FieldValue.delete();
    }

    await materialRef.update(updateData);
    
    // 如果庫存有變更，建立庫存紀錄（以動作為單位）
    if (stockChanged) {
      try {
        const inventoryRecordRef = db.collection("inventory_records").doc();
        await inventoryRecordRef.set({
          changeDate: FieldValue.serverTimestamp(),
          changeReason: 'manual_adjustment',
          operatorId: contextAuth?.uid || 'unknown',
          operatorName: contextAuth?.token?.name || '未知用戶',
          remarks: '透過編輯對話框直接修改庫存',
          relatedDocumentId: materialId,
          relatedDocumentType: 'material_edit',
          details: [{
            itemId: materialId,
            itemType: 'material',
            itemCode: updatedCode,
            itemName: name,
            quantityChange: newStock - oldStock,
            quantityAfter: newStock
          }],
          createdAt: FieldValue.serverTimestamp(),
        });
        
        logger.info(`已建立庫存紀錄，庫存從 ${oldStock} 變更為 ${newStock}`);
      } catch (error) {
        logger.error(`建立庫存紀錄失敗:`, error);
        // 不阻擋主要更新流程，只記錄錯誤
      }
    }
    
    logger.info(`管理員 ${contextAuth?.uid} 成功更新物料: ${materialId}`);
    logger.info(`更新完成，返回結果:`, { status: "success", message: `物料 ${name} 已成功更新。`, updatedCode });
    
    return {
      status: "success",
      message: `物料 ${name} 已成功更新。`,
      updatedCode
    };
  } catch (error) {
    logger.error(`更新物料 ${materialId} 時發生錯誤:`, error);
    throw new HttpsError("internal", "更新物料時發生未知錯誤。");
  }
});

export const deleteMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  const { materialId } = data;
  
  if (!materialId) { 
    throw new HttpsError("invalid-argument", "請求缺少 materialId。"); 
  }
  
  try {
    await db.collection("materials").doc(materialId).delete();
    logger.info(`管理員 ${contextAuth?.uid} 成功刪除物料: ${materialId}`);
    
    return { 
      status: "success", 
      message: "物料已成功刪除。", 
    };
  } catch (error) { 
    logger.error(`刪除物料 ${materialId} 時發生錯誤:`, error); 
    throw new HttpsError("internal", "刪除物料時發生未知錯誤。"); 
  }
});

// 匯入物料時的除錯機制
export const importMaterials = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  const { materials } = data;
  
  logger.info(`開始處理物料匯入:`, {
    totalMaterials: materials?.length || 0,
  });
  
  if (!materials || !Array.isArray(materials)) {
    throw new HttpsError("invalid-argument", "請求缺少物料資料陣列。");
  }

  try {
    const results = [];
    const batch = db.batch();
    const allCodesInDb = new Set<string>();
    const allCodesInThisBatch = new Set<string>();

    // 1. Pre-fetch all existing material codes for efficiency
    const allMaterialsQuery = await db.collection("materials").get();
    const existingMaterialsMap = new Map();
    allMaterialsQuery.docs.forEach(doc => {
      const docData = doc.data();
      if (docData.code) {
        allCodesInDb.add(docData.code);
        existingMaterialsMap.set(docData.code, {
          docId: doc.id,
          docRef: doc.ref,
          data: docData
        });
      }
    });
    logger.info(`已預先載入 ${allCodesInDb.size} 個現有物料代號。`);

    for (const materialData of materials) {
      try {
        let processedData = { ...materialData };
        if (!processedData.category || !processedData.subCategory) {
          processedData = await autoGenerateCategories(processedData);
        }

        const mainCategoryId = await getOrCreateCategoryId(processedData.category, 'category');
        const subCategoryId = await getOrCreateCategoryId(processedData.subCategory, 'subCategory');

        let finalCode = processedData.code;
        const originalCode = finalCode;
        let codeChanged = false;

        // 智能匹配邏輯：檢查物料代號是否存在
        const existingMaterial = finalCode ? existingMaterialsMap.get(finalCode) : null;
        
        if (!finalCode || allCodesInDb.has(finalCode) || allCodesInThisBatch.has(finalCode)) {
          if (existingMaterial) {
            // 代號已存在，執行更新
            logger.info(`物料代號 ${finalCode} 已存在，執行更新操作`);
          } else {
            // 代號不存在或重複，生成新代號
            finalCode = generateUniqueMaterialCode(mainCategoryId, subCategoryId, new Set([...allCodesInDb, ...allCodesInThisBatch]));
            codeChanged = true;
            logger.warn(`代號 ${originalCode || '未提供'} 重複或無效，已生成新代號: ${finalCode}`);
          }
        }

        allCodesInThisBatch.add(finalCode);

        const materialDataToSave: MaterialData = { 
          code: finalCode, 
          name: processedData.name, 
          category: processedData.category || "", 
          subCategory: processedData.subCategory || "", 
          mainCategoryId,
          subCategoryId,
          safetyStockLevel: Number(processedData.safetyStockLevel) || 0, 
          costPerUnit: Number(processedData.costPerUnit) || 0, 
          unit: processedData.unit || "", 
          currentStock: Number(processedData.currentStock) || 0, 
          notes: processedData.notes || "",
          updatedAt: FieldValue.serverTimestamp(), 
        };
        
        // Supplier handling can be further optimized if needed
        if (processedData.supplierId) { 
          materialDataToSave.supplierRef = db.collection("suppliers").doc(processedData.supplierId); 
        } else if (processedData.supplierName) {
          const supplierQuery = await db.collection("suppliers").where("name", "==", processedData.supplierName).limit(1).get();
          if (!supplierQuery.empty) {
            materialDataToSave.supplierRef = supplierQuery.docs[0].ref;
          } else {
            const newSupplierRef = db.collection("suppliers").doc();
            batch.set(newSupplierRef, {
              name: processedData.supplierName,
              notes: `自動創建於物料匯入 - ${processedData.name}`,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });
            materialDataToSave.supplierRef = newSupplierRef;
          }
        }

        let action = "created";
        
        if (existingMaterial) {
          // 物料代號已存在，執行更新
          batch.update(existingMaterial.docRef, materialDataToSave);
          action = "updated";
        } else {
          // 物料代號不存在，執行新增
          materialDataToSave.createdAt = FieldValue.serverTimestamp();
          const newDocRef = db.collection("materials").doc();
          batch.set(newDocRef, materialDataToSave);
          action = "created";
        }
        
        results.push({
          name: processedData.name,
          status: "success",
          action: action,
          code: finalCode,
          originalCode: codeChanged ? originalCode : undefined,
          codeChanged: codeChanged
        });
        
      } catch (error) {
        results.push({
          name: materialData.name,
          status: "error",
          error: error instanceof Error ? error.message : "未知錯誤"
        });
        logger.error(`匯入物料失敗: ${materialData.name}`, error);
      }
    }
    
    await batch.commit();

    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;
    
    logger.info(`匯入完成統計:`, {
      total: materials.length,
      success: successCount,
      error: errorCount,
      skipped: skippedCount,
    });
    
    return { 
      status: "success", 
      message: `匯入完成：成功 ${successCount} 項，失敗 ${errorCount} 項，跳過 ${skippedCount} 項。`, 
      results
    };
  } catch (error) { 
    logger.error("匯入物料時發生錯誤:", error); 
    throw new HttpsError("internal", "匯入物料時發生未知錯誤。"); 
  }
});
