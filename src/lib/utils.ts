import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { collection, getDocs, DocumentReference, DocumentData, doc, getDoc, query, where } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成隨機 2 位大寫英文字母 ID (主分類)
export function generateCategoryId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

// 生成隨機 3 位數字 ID (細分分類)
export function generateSubCategoryId(): string {
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 生成 4 位隨機數字 (物料代碼的隨機部分)
export function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 新的物料代號生成：主分類ID(2位字母) + 細分分類ID(3位數字) + 隨機生成碼(4位數字) = 9碼
export function generateMaterialCode(mainCategoryId: string, subCategoryId: string, randomCode?: string): string {
  // 確保主分類ID是2位字母
  const categoryId = mainCategoryId ? mainCategoryId.substring(0, 2).toUpperCase() : 'XX';
  
  // 確保細分分類ID是3位數字
  const subCategoryIdStr = subCategoryId ? subCategoryId.padStart(3, '0').substring(0, 3) : '000';
  
  // 生成或使用現有的隨機生成碼
  const randomPart = randomCode || generateRandomCode();
  
  return `${categoryId}${subCategoryIdStr}${randomPart}`;
}

// 從物料代號中提取各部分
export function parseMaterialCode(code: string): {
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
export function updateMaterialCode(oldCode: string, newMainCategoryId: string, newSubCategoryId: string): string {
  try {
    const { randomCode } = parseMaterialCode(oldCode);
    return generateMaterialCode(newMainCategoryId, newSubCategoryId, randomCode);
  } catch (error) {
    // 如果解析失敗，生成新的完整代號
    return generateMaterialCode(newMainCategoryId, newSubCategoryId);
  }
}

// 檢查 ID 是否已存在
export async function isIdExists(id: string, collection: string, db: any): Promise<boolean> {
  try {
    const { collection: firestoreCollection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(firestoreCollection(db, collection), where('id', '==', id));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('檢查 ID 是否存在時發生錯誤:', error);
    return false;
  }
}

// 生成唯一的主分類 ID
export async function generateUniqueCategoryId(db: any): Promise<string> {
  let id = generateCategoryId();
  let attempts = 0;
  const maxAttempts = 10;

  while (await isIdExists(id, 'materialCategories', db) && attempts < maxAttempts) {
    id = generateCategoryId();
    attempts++;
  }

  return id;
}

// 生成唯一的細分分類 ID
export async function generateUniqueSubCategoryId(db: any): Promise<string> {
  let id = generateSubCategoryId();
  let attempts = 0;
  const maxAttempts = 10;

  while (await isIdExists(id, 'materialSubCategories', db) && attempts < maxAttempts) {
    id = generateSubCategoryId();
    attempts++;
  }

  return id;
}

// 檢查物料代號是否已存在
export async function isMaterialCodeExists(code: string, db: any): Promise<boolean> {
  try {
    const { collection: firestoreCollection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(firestoreCollection(db, 'materials'), where('code', '==', code));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('檢查物料代號是否存在時發生錯誤:', error);
    return false;
  }
}

// 生成唯一的物料代號
export async function generateUniqueMaterialCode(mainCategoryId: string, subCategoryId: string, db: any): Promise<string> {
  let code = generateMaterialCode(mainCategoryId, subCategoryId);
  let attempts = 0;
  const maxAttempts = 10;

  while (await isMaterialCodeExists(code, db) && attempts < maxAttempts) {
    code = generateMaterialCode(mainCategoryId, subCategoryId);
    attempts++;
  }

  return code;
}

// 分類圖示映射
export const categoryIcons = {
  '原料': '🌾',
  '包材': '📦',
  '香精': '🌸',
  '添加劑': '🧪',
  '設備': '⚙️',
  '工具': '🔧',
  '耗材': '📋',
  '其他': '📌',
  'default': '📦'
};

// 分類顏色映射 - 同一個主分類使用相同顏色
export const categoryColors = {
  '原料': 'bg-green-100',
  '包材': 'bg-blue-100',
  '香精': 'bg-pink-100',
  '添加劑': 'bg-purple-100',
  '設備': 'bg-gray-100',
  '工具': 'bg-orange-100',
  '耗材': 'bg-yellow-100',
  '其他': 'bg-indigo-100',
  'default': 'bg-gray-100'
};

// 獲取分類圖示
export function getCategoryIcon(category: string): string {
  return categoryIcons[category as keyof typeof categoryIcons] || categoryIcons.default;
}

// 獲取分類顏色 - 同一個主分類使用相同顏色
export function getCategoryColor(category: string): string {
  return categoryColors[category as keyof typeof categoryColors] || categoryColors.default;
}

// 生成隨機背景顏色（已棄用，改用固定分類顏色）
export function generateRandomBgColor(): string {
  const colors = [
    'bg-red-100', 'bg-orange-100', 'bg-yellow-100', 'bg-green-100',
    'bg-teal-100', 'bg-blue-100', 'bg-indigo-100', 'bg-purple-100',
    'bg-pink-100', 'bg-rose-100', 'bg-amber-100', 'bg-lime-100',
    'bg-emerald-100', 'bg-cyan-100', 'bg-sky-100', 'bg-violet-100'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 自動生成分類和子分類
export async function autoGenerateCategories(materialData: any, db: any) {
  const { collection: firestoreCollection, addDoc, getDocs, query, where } = await import('firebase/firestore');
  
  // 如果沒有分類，自動生成
  if (!materialData.category) {
    const categoryName = '自動分類_' + Math.floor(Math.random() * 1000);
    const categoryDoc = await addDoc(firestoreCollection(db, 'materialCategories'), {
      name: categoryName,
      type: 'category',
      createdAt: new Date()
    });
    materialData.category = categoryName;
    console.log('自動生成主分類:', categoryName);
  }
  
  // 如果沒有子分類，自動生成
  if (!materialData.subCategory) {
    const subCategoryName = '自動子分類_' + Math.floor(Math.random() * 1000);
    const subCategoryDoc = await addDoc(firestoreCollection(db, 'materialSubCategories'), {
      name: subCategoryName,
      type: 'subCategory',
      parentCategory: materialData.category,
      createdAt: new Date()
    });
    materialData.subCategory = subCategoryName;
    console.log('自動生成子分類:', subCategoryName);
  }
  
  return materialData;
}

// 產品類型代號映射
export const PRODUCT_TYPE_CODES = {
  '罐裝油(BOT)': 'BOT',
  '一代棉芯煙彈(OMP)': 'OMP',
  '一代陶瓷芯煙彈(OTP)': 'OTP',
  '五代陶瓷芯煙彈(FTP)': 'FTP',
  '其他(ETC)': 'ETC',
} as const;

// 生成完整的產品編號
export async function generateCompleteProductCode(
  seriesCode: string, 
  productType: string, 
  db: any
): Promise<string> {
  try {
    // 獲取產品類型代號
    const typeCode = PRODUCT_TYPE_CODES[productType as keyof typeof PRODUCT_TYPE_CODES] || 'ETC';
    
    // 查詢該系列下現有的產品數量
    const productsQuery = query(
      collection(db, 'products'),
      where('seriesRef', '==', doc(db, 'productSeries', seriesCode))
    );
    const productsSnapshot = await getDocs(productsQuery);
    const existingCount = productsSnapshot.size;
    
    // 生成序號（從1開始）
    const sequenceNumber = (existingCount + 1).toString().padStart(3, '0');
    
    // 組合完整編號：[類型代號+系列代號+產品序號]
    const completeCode = `${typeCode}${seriesCode}${sequenceNumber}`;
    
    return completeCode;
  } catch (error) {
    console.error('生成產品編號失敗:', error);
    throw new Error('生成產品編號失敗');
  }
}

// 解析產品編號
export function parseProductCode(productCode: string): {
  typeCode: string;
  seriesCode: string;
  sequenceNumber: string;
} | null {
  // 產品編號格式：[類型代號+系列代號+產品序號]
  // 例如：BOTJNK001, OMPMSK002
  
  if (productCode.length < 6) {
    return null;
  }
  
  // 提取類型代號（前3個字符）
  const typeCode = productCode.substring(0, 3);
  
  // 提取系列代號（中間部分，通常是3個字符）
  const seriesCode = productCode.substring(3, 6);
  
  // 提取序號（最後3個字符）
  const sequenceNumber = productCode.substring(6);
  
  return {
    typeCode,
    seriesCode,
    sequenceNumber,
  };
}

// 驗證產品編號格式
export function validateProductCode(productCode: string): boolean {
  const parsed = parseProductCode(productCode);
  if (!parsed) {
    return false;
  }
  
  // 檢查類型代號是否有效
  const validTypeCodes = Object.values(PRODUCT_TYPE_CODES);
  if (!validTypeCodes.includes(parsed.typeCode as any)) {
    return false;
  }
  
  // 檢查序號是否為數字
  if (!/^\d+$/.test(parsed.sequenceNumber)) {
    return false;
  }
  
  return true;
}
