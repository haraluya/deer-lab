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

// 檢查物料代號是否已存在
async function isMaterialCodeExists(code: string): Promise<boolean> {
  try {
    const existingMaterials = await db.collection("materials")
      .where("code", "==", code)
      .get();
    return !existingMaterials.empty;
  } catch (error) {
    logger.error('檢查物料代號是否存在時發生錯誤:', error);
    return false;
  }
}

// 生成唯一的物料代號
async function generateUniqueMaterialCode(mainCategoryId: string, subCategoryId: string): Promise<string> {
  let code = generateMaterialCode(mainCategoryId, subCategoryId);
  let attempts = 0;
  const maxAttempts = 10;

  while (await isMaterialCodeExists(code) && attempts < maxAttempts) {
    code = generateMaterialCode(mainCategoryId, subCategoryId);
    attempts++;
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
  // 暫時移除權限檢查
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
      finalCode = await generateUniqueMaterialCode(mainCategoryId, subCategoryId);
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
  // 暫時移除權限檢查
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  const { materialId, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit, notes } = data;
  
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

    const updateData: Partial<MaterialData> = {
      name,
      category: category || "",
      subCategory: subCategory || "",
      code: updatedCode,
      safetyStockLevel: Number(safetyStockLevel) || 0,
      costPerUnit: Number(costPerUnit) || 0,
      unit: unit || "",
      notes: notes || "",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (supplierId) {
      updateData.supplierRef = db.collection("suppliers").doc(supplierId);
    } else {
      updateData.supplierRef = FieldValue.delete();
    }

    await materialRef.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功更新物料: ${materialId}`);
    
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
  // 暫時移除權限檢查
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
  // 暫時移除權限檢查
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  const { materials, updateMode = false } = data;
  
  if (!materials || !Array.isArray(materials)) {
    throw new HttpsError("invalid-argument", "請求缺少物料資料陣列。");
  }

  try {
    const results = [];
    
    for (const materialData of materials) {
      try {
        // 自動生成分類和子分類（如果沒有提供）
        let processedData = { ...materialData };
        if (!processedData.category || !processedData.subCategory) {
          processedData = await autoGenerateCategories(processedData);
        }

        // 獲取分類ID
        const mainCategoryId = await getOrCreateCategoryId(processedData.category, 'category');
        const subCategoryId = await getOrCreateCategoryId(processedData.subCategory, 'subCategory');

        // 如果沒有提供代號，自動生成
        let finalCode = processedData.code;
        if (!finalCode) {
          finalCode = await generateUniqueMaterialCode(mainCategoryId, subCategoryId);
        }

        // 檢查代號是否重複，如果重複則生成新代號
        let isCodeUnique = false;
        let attempts = 0;
        const maxAttempts = 10; // 最多嘗試10次生成唯一代號
        const originalCode = finalCode; // 保存原始代號

        while (!isCodeUnique && attempts < maxAttempts) {
          // 檢查代號是否已存在
          const existingCodeQuery = await db.collection("materials")
            .where("code", "==", finalCode)
            .limit(1)
            .get();
          
          if (existingCodeQuery.empty) {
            // 代號唯一，可以使用
            isCodeUnique = true;
            logger.info(`代號 ${finalCode} 檢查通過，可以使用`);
          } else {
            // 代號重複，生成新代號
            attempts++;
            logger.warn(`代號 ${finalCode} 已存在，重新生成 (嘗試 ${attempts}/${maxAttempts})`);
            
            if (attempts < maxAttempts) {
              // 生成新的隨機代號
              finalCode = await generateUniqueMaterialCode(mainCategoryId, subCategoryId);
            } else {
              // 達到最大嘗試次數，使用時間戳作為後綴
              const timestamp = Date.now().toString().slice(-6);
              finalCode = `${finalCode}_${timestamp}`;
              logger.warn(`達到最大嘗試次數，使用時間戳後綴: ${finalCode}`);
              isCodeUnique = true; // 強制使用這個代號
            }
          }
        }

        // 在更新模式下，先查找現有物料
        let existingMaterialDoc = null;
        if (updateMode && finalCode) {
          const existingQuery = await db.collection("materials")
            .where("code", "==", finalCode)
            .limit(1)
            .get();
          
          if (!existingQuery.empty) {
            existingMaterialDoc = existingQuery.docs[0];
            logger.info(`找到現有物料: ${finalCode} (${existingMaterialDoc.id})`);
          }
        }

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
        
        // 處理供應商 - 支援 supplierId 和 supplierName
        if (processedData.supplierId) { 
          materialDataToSave.supplierRef = db.collection("suppliers").doc(processedData.supplierId); 
        } else if (processedData.supplierName) {
          // 根據供應商名稱查找或創建供應商
          try {
            const supplierQuery = await db.collection("suppliers")
              .where("name", "==", processedData.supplierName)
              .limit(1)
              .get();
            
            if (!supplierQuery.empty) {
              // 找到現有供應商
              materialDataToSave.supplierRef = supplierQuery.docs[0].ref;
            } else {
              // 創建新供應商
              const newSupplierRef = await db.collection("suppliers").add({
                name: processedData.supplierName,
                products: "",
                contactWindow: "",
                contactMethod: "",
                liaisonPersonId: "",
                notes: `自動創建於物料匯入 - ${processedData.name}`,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
              });
              materialDataToSave.supplierRef = newSupplierRef;
              logger.info(`自動創建供應商: ${processedData.supplierName} (${newSupplierRef.id})`);
            }
          } catch (supplierError) {
            logger.warn(`處理供應商 ${processedData.supplierName} 時發生錯誤:`, supplierError);
            // 供應商處理失敗不影響物料匯入
          }
        }

        let docRef;
        let action = "created";

        if (updateMode && existingMaterialDoc) {
          // 更新現有物料
          await existingMaterialDoc.ref.update(materialDataToSave);
          docRef = existingMaterialDoc.ref;
          action = "updated";
          logger.info(`更新物料成功: ${processedData.name} (${docRef.id})`);
        } else if (updateMode && !existingMaterialDoc) {
          // 更新模式下找不到現有物料，跳過
          results.push({
            name: processedData.name,
            status: "skipped",
            reason: `找不到物料代號: ${finalCode}`,
            code: finalCode
          });
          logger.info(`跳過物料: ${processedData.name} (代號: ${finalCode}) - 找不到現有資料`);
          continue;
        } else {
          // 新增模式或非更新模式
          materialDataToSave.createdAt = FieldValue.serverTimestamp();
          docRef = await db.collection("materials").add(materialDataToSave);
          action = "created";
          logger.info(`新增物料成功: ${processedData.name} (${docRef.id})`);
        }
        
        results.push({
          name: processedData.name,
          status: "success",
          materialId: docRef.id,
          action: action,
          code: finalCode,
          originalCode: originalCode !== finalCode ? originalCode : undefined,
          codeChanged: originalCode !== finalCode
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
    
    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;
    
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
