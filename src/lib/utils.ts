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
