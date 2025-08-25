import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成隨機 2 位大寫英文字母 ID
export function generateCategoryId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

// 生成隨機 3 位數字 ID
export function generateSubCategoryId(): string {
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 生成物料代號：分類+子分類+2位隨機數字
export function generateMaterialCode(category: string, subCategory: string): string {
  const categoryPrefix = category ? category.substring(0, 2).toUpperCase() : 'XX';
  const subCategoryPrefix = subCategory ? subCategory.substring(0, 2).toUpperCase() : 'XX';
  const randomNum = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${categoryPrefix}${subCategoryPrefix}${randomNum}`;
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

// 生成唯一的分類 ID
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
export async function generateUniqueMaterialCode(category: string, subCategory: string, db: any): Promise<string> {
  let code = generateMaterialCode(category, subCategory);
  let attempts = 0;
  const maxAttempts = 10;

  while (await isMaterialCodeExists(code, db) && attempts < maxAttempts) {
    code = generateMaterialCode(category, subCategory);
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
