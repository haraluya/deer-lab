// src/lib/imageUpload.ts
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface ImageUploadOptions {
  folder?: string;
  fileName?: string;
  maxSize?: number; // MB
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number;
}

// 預設配置
const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  folder: 'uploads',
  fileName: '',
  maxSize: 10, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  compress: true,
  quality: 0.7
};

// 圖片壓縮函數
export const compressImage = (file: File, quality: number = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 計算新的尺寸，最大 1280x720 (720P)
      const maxWidth = 1280;
      const maxHeight = 720;
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('圖片壓縮失敗'));
            }
          },
          file.type,
          quality
        );
      } else {
        reject(new Error('無法創建 canvas context'));
      }
    };

    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = URL.createObjectURL(file);
  });
};

// 生成檔案路徑
const generateFilePath = (folder: string, fileName: string): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const timestamp = Date.now();
  
  return `${folder}/${year}/${month}/${day}/${hour}/${minute}/${timestamp}_${fileName}`;
};

// 驗證檔案
const validateFile = (file: File, options: Required<ImageUploadOptions>): string | null => {
  // 檢查檔案大小
  if (file.size > options.maxSize * 1024 * 1024) {
    return `檔案大小不能超過 ${options.maxSize}MB`;
  }

  // 檢查檔案類型
  if (!options.allowedTypes.includes(file.type)) {
    return `不支援的檔案類型: ${file.type}`;
  }

  return null;
};

// 主要上傳函數
export const uploadImage = async (
  file: File, 
  options: ImageUploadOptions = {}
): Promise<ImageUploadResult> => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // 驗證檔案
    const validationError = validateFile(file, config);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // 檢查 Firebase Storage 是否可用
    if (!storage) {
      return { success: false, error: 'Firebase Storage 未初始化' };
    }

    // 壓縮圖片（如果需要）
    let uploadFile = file;
    if (config.compress) {
      try {
        uploadFile = await compressImage(file, config.quality);
        console.log('圖片壓縮完成:', uploadFile.name, '大小:', uploadFile.size);
      } catch (error) {
        console.warn('圖片壓縮失敗，使用原始檔案:', error);
      }
    }

    // 生成檔案路徑
    const fileName = config.fileName || file.name;
    const filePath = generateFilePath(config.folder, fileName);
    
    // 創建 Storage 引用
    const storageRef = ref(storage, filePath);
    
    // 設定元數據
    const metadata = {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000', // 1年快取
    };

    // 上傳檔案
    const snapshot = await uploadBytes(storageRef, uploadFile, metadata);
    console.log('檔案上傳成功:', filePath);

    // 獲取下載 URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('下載 URL:', downloadURL);

    return {
      success: true,
      url: downloadURL,
      path: filePath
    };

  } catch (error) {
    console.error('圖片上傳失敗:', error);
    
    // 嘗試使用 Base64 備用方法
    try {
      console.log('嘗試使用 Base64 備用方法...');
      const base64Url = await fileToBase64(file);
      return {
        success: true,
        url: base64Url,
        path: 'base64'
      };
    } catch (base64Error) {
      console.error('Base64 備用方法也失敗:', base64Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }
};

// Base64 備用方法
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };
    reader.readAsDataURL(file);
  });
};

// 批量上傳
export const uploadMultipleImages = async (
  files: File[], 
  options: ImageUploadOptions = {}
): Promise<ImageUploadResult[]> => {
  const results: ImageUploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadImage(file, options);
    results.push(result);
  }
  
  return results;
};

// 刪除圖片
export const deleteImage = async (path: string): Promise<boolean> => {
  try {
    if (!storage) {
      console.error('Firebase Storage 未初始化');
      return false;
    }

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('圖片刪除成功:', path);
    return true;
  } catch (error) {
    console.error('圖片刪除失敗:', error);
    return false;
  }
};

// 獲取圖片 URL（如果路徑是 Firebase Storage 路徑）
export const getImageURL = async (path: string): Promise<string | null> => {
  try {
    if (!storage) {
      console.error('Firebase Storage 未初始化');
      return null;
    }

    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('獲取圖片 URL 失敗:', error);
    return null;
  }
};
