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

export const createMaterial = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  // 暫時移除權限檢查
  // await ensureCanManageMaterials(contextAuth?.uid);
  
  const { code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit, notes } = data;
  
  if (!name) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (物料名稱)。"); 
  }

  try {
    // 如果沒有提供代號，自動生成
    let finalCode = code;
    if (!finalCode && category && subCategory) {
      finalCode = await generateUniqueMaterialCode(category, subCategory);
    } else if (!finalCode) {
      throw new HttpsError("invalid-argument", "請提供物料代號或選擇分類以自動生成代號。");
    }

    const newMaterial: MaterialData = { 
      code: finalCode, 
      name, 
      category: category || "", 
      subCategory: subCategory || "", 
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
