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
  safetyStockLevel: number; 
  costPerUnit: number; 
  unit: string; 
  currentStock?: number; 
  createdAt?: FieldValue; 
  updatedAt: FieldValue; 
  supplierRef?: DocumentReference | FieldValue;
  notes?: string;
}

// 生成物料代號：分類+子分類+2位隨機數字
function generateMaterialCode(category: string, subCategory: string): string {
  const categoryPrefix = category ? category.substring(0, 2).toUpperCase() : 'XX';
  const subCategoryPrefix = subCategory ? subCategory.substring(0, 2).toUpperCase() : 'XX';
  const randomNum = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${categoryPrefix}${subCategoryPrefix}${randomNum}`;
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
async function generateUniqueMaterialCode(category: string, subCategory: string): Promise<string> {
  let code = generateMaterialCode(category, subCategory);
  let attempts = 0;
  const maxAttempts = 10;

  while (await isMaterialCodeExists(code) && attempts < maxAttempts) {
    code = generateMaterialCode(category, subCategory);
    attempts++;
  }

  return code;
}

// 自動生成分類和子分類
async function autoGenerateCategories(materialData: any) {
  // 如果沒有分類，自動生成
  if (!materialData.category) {
    const categoryName = '自動分類_' + Math.floor(Math.random() * 1000);
    await db.collection('materialCategories').add({
      name: categoryName,
      type: 'category',
      createdAt: FieldValue.serverTimestamp()
    });
    materialData.category = categoryName;
    logger.info('自動生成主分類:', categoryName);
  }
  
  // 如果沒有子分類，自動生成
  if (!materialData.subCategory) {
    const subCategoryName = '自動子分類_' + Math.floor(Math.random() * 1000);
    await db.collection('materialSubCategories').add({
      name: subCategoryName,
      type: 'subCategory',
      parentCategory: materialData.category,
      createdAt: FieldValue.serverTimestamp()
    });
    materialData.subCategory = subCategoryName;
    logger.info('自動生成子分類:', subCategoryName);
  }
  
  return materialData;
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

    // 如果沒有提供代號，自動生成
    let finalCode = code;
    if (!finalCode && processedData.category && processedData.subCategory) {
      finalCode = await generateUniqueMaterialCode(processedData.category, processedData.subCategory);
    } else if (!finalCode) {
      throw new HttpsError("invalid-argument", "請提供物料代號或選擇分類以自動生成代號。");
    }

    const newMaterial: MaterialData = { 
      code: finalCode, 
      name, 
      category: processedData.category || "", 
      subCategory: processedData.subCategory || "", 
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
  
  const { materialId, code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit, notes } = data;
  
  if (!materialId || !name) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (materialId, name)。"); 
  }
  
  try {
    const materialRef = db.collection("materials").doc(materialId);
    const updateData: Partial<MaterialData> = { 
      name, 
      category: category || "", 
      subCategory: subCategory || "", 
      safetyStockLevel: Number(safetyStockLevel) || 0, 
      costPerUnit: Number(costPerUnit) || 0, 
      unit: unit || "", 
      notes: notes || "",
      updatedAt: FieldValue.serverTimestamp(), 
    };
    
    // 如果提供了新的代號，則更新代號
    if (code) {
      updateData.code = code;
    }
    
    if (supplierId) { 
      updateData.supplierRef = db.collection("suppliers").doc(supplierId); 
    } else { 
      updateData.supplierRef = FieldValue.delete(); 
    }
    
    await materialRef.update(updateData);
    logger.info(`管理員 ${contextAuth?.uid} 成功更新物料資料: ${materialId}`);
    
    return { 
      status: "success", 
      message: `物料 ${name} 的資料已成功更新。`, 
    };
  } catch (error) { 
    logger.error(`更新物料 ${materialId} 時發生錯誤:`, error); 
    throw new HttpsError("internal", "更新物料資料時發生未知錯誤。"); 
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
  
  const { materials } = data;
  
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

        // 如果沒有提供代號，自動生成
        let finalCode = processedData.code;
        if (!finalCode && processedData.category && processedData.subCategory) {
          finalCode = await generateUniqueMaterialCode(processedData.category, processedData.subCategory);
        }

        const newMaterial: MaterialData = { 
          code: finalCode, 
          name: processedData.name, 
          category: processedData.category || "", 
          subCategory: processedData.subCategory || "", 
          safetyStockLevel: Number(processedData.safetyStockLevel) || 0, 
          costPerUnit: Number(processedData.costPerUnit) || 0, 
          unit: processedData.unit || "", 
          currentStock: Number(processedData.currentStock) || 0, 
          notes: processedData.notes || "",
          createdAt: FieldValue.serverTimestamp(), 
          updatedAt: FieldValue.serverTimestamp(), 
        };
        
        if (processedData.supplierId) { 
          newMaterial.supplierRef = db.collection("suppliers").doc(processedData.supplierId); 
        }
        
        const docRef = await db.collection("materials").add(newMaterial);
        results.push({
          name: processedData.name,
          status: "success",
          materialId: docRef.id,
          generatedCode: finalCode
        });
        
        logger.info(`匯入物料成功: ${processedData.name} (${docRef.id})`);
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
    
    return { 
      status: "success", 
      message: `匯入完成：成功 ${successCount} 項，失敗 ${errorCount} 項。`, 
      results
    };
  } catch (error) { 
    logger.error("匯入物料時發生錯誤:", error); 
    throw new HttpsError("internal", "匯入物料時發生未知錯誤。"); 
  }
});
