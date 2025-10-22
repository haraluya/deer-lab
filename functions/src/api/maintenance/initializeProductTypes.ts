// functions/src/api/maintenance/initializeProductTypes.ts
/**
 * 🎯 初始化產品類型資料
 *
 * 建立時間：2025-01-22
 * 功能：將預設的產品類型寫入 Firestore
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { CrudApiHandlers } from "../../utils/apiWrapper";
import { BusinessError, ApiErrorCode } from "../../utils/errorHandler";

const db = getFirestore();

// 預設產品類型資料
const DEFAULT_PRODUCT_TYPES = [
  {
    name: '罐裝油',
    code: 'BOT',
    color: 'blue',
    description: '罐裝油產品類型',
    isActive: true
  },
  {
    name: '一代棉芯煙彈',
    code: 'OMP',
    color: 'purple',
    description: '一代棉芯煙彈產品類型',
    isActive: true
  },
  {
    name: '一代陶瓷芯煙彈',
    code: 'OTP',
    color: 'pink',
    description: '一代陶瓷芯煙彈產品類型',
    isActive: true
  },
  {
    name: '五代陶瓷芯煙彈',
    code: 'FTP',
    color: 'orange',
    description: '五代陶瓷芯煙彈產品類型',
    isActive: true
  },
  {
    name: '其他',
    code: 'ETC',
    color: 'gray',
    description: '其他產品類型',
    isActive: true
  }
];

/**
 * 初始化產品類型
 */
export const initializeProductTypes = CrudApiHandlers.createReadHandler(
  'InitializeProductTypes',
  async (data: any, context, requestId) => {
    try {
      console.log('🚀 開始初始化產品類型資料...');

      // 檢查是否已經有產品類型資料
      const existingTypes = await db.collection('productTypes').get();

      const results = {
        added: [] as string[],
        skipped: [] as string[],
        errors: [] as string[]
      };

      for (const type of DEFAULT_PRODUCT_TYPES) {
        try {
          // 檢查是否已存在相同代碼的類型
          const existing = await db.collection('productTypes')
            .where('code', '==', type.code)
            .limit(1)
            .get();

          if (!existing.empty) {
            console.log(`⏭️  跳過已存在的類型：${type.name} (${type.code})`);
            results.skipped.push(`${type.name} (${type.code})`);
            continue;
          }

          // 新增產品類型
          const docRef = db.collection('productTypes').doc();
          const typeData = {
            id: docRef.id,
            ...type,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: context.auth?.uid || 'system',
            updatedBy: context.auth?.uid || 'system'
          };

          await docRef.set(typeData);
          console.log(`✅ 已新增產品類型：${type.name} (${type.code}) - 顏色：${type.color}`);
          results.added.push(`${type.name} (${type.code})`);

        } catch (error) {
          console.error(`❌ 新增類型失敗：${type.name}`, error);
          results.errors.push(`${type.name}: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      }

      return {
        success: true,
        message: '產品類型初始化完成',
        data: {
          summary: {
            total: DEFAULT_PRODUCT_TYPES.length,
            added: results.added.length,
            skipped: results.skipped.length,
            errors: results.errors.length
          },
          details: results
        }
      };

    } catch (error) {
      console.error('❌ 初始化失敗：', error);
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '初始化產品類型時發生錯誤',
        error
      );
    }
  }
);
