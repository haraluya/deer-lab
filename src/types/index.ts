// src/types/index.ts
/**
 * 鹿鹿小作坊系統核心類型定義
 * 統一管理所有 TypeScript 介面和類型
 */

// 重新導出所有類型定義
export * from './auth';
export * from './ui';
export * from './api';

// 優先使用統一實體類型，避免重複匯出
export * from './entities';

// 從 firebase.ts 匯出基本類型
export type {
  FirebaseDocument,
  FirebaseResponse,
  CloudFunctionResult,
  FirebaseError
} from './firebase';

// 僅匯出 business.ts 中不與 entities.ts 衝突的類型
export type { 
  PersonnelTimeStats,
  InventoryRecord,
  InventoryOverview,
  FragranceChangeHistory,
  FragranceChangeHistoryQuery,
  FragranceChangeHistoryResult,
  FragranceStatusUpdateParams
} from './business';