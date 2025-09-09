import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  doc, 
  getDoc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { BUSINESS_CONFIG } from '@/config/business';

// 明細紀錄介面
export interface InventoryRecordDetail {
  itemId: string;
  itemType: 'material' | 'fragrance';
  itemCode: string;
  itemName: string;
  quantityChange: number;
  quantityAfter: number;
}

// 主紀錄介面（以動作為單位）
export interface InventoryRecord {
  id?: string;
  changeDate: Date;
  changeReason: 'purchase' | 'workorder' | 'inventory_check' | 'manual_adjustment';
  operatorId: string;
  operatorName: string;
  remarks?: string;
  relatedDocumentId?: string;
  relatedDocumentType?: string;
  details: InventoryRecordDetail[]; // 該動作影響的所有物料/香精明細
  createdAt: Date;
}

export interface InventoryRecordQueryParams {
  changeReason?: string;
  operatorId?: string;
  remarks?: string;
  startDate?: Date;
  endDate?: Date;
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

export interface InventoryRecordQueryResult {
  records: InventoryRecord[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * 建立庫存紀錄（以動作為單位）
 */
export async function createInventoryRecord(record: Omit<InventoryRecord, 'id' | 'createdAt'>): Promise<string> {
  try {
    if (!db) {
      throw new Error('Firebase 未初始化');
    }

    const recordData = {
      ...record,
      changeDate: Timestamp.fromDate(record.changeDate),
      createdAt: Timestamp.fromDate(new Date())
    };

    const docRef = await addDoc(collection(db, 'inventory_records'), recordData);
    return docRef.id;
  } catch (error) {
    console.error('建立庫存紀錄失敗:', error);
    throw new Error(`建立庫存紀錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 查詢庫存紀錄（動作層級）
 */
export async function getInventoryRecords(params: InventoryRecordQueryParams = {}): Promise<InventoryRecordQueryResult> {
  try {
    if (!db) {
      throw new Error('Firebase 未初始化');
    }

    const {
      changeReason,
      operatorId,
      remarks,
      startDate,
      endDate,
      pageSize = BUSINESS_CONFIG.inventory.pagination.defaultPageSize,
      lastDoc
    } = params;

    let q = query(collection(db, 'inventory_records'), orderBy('changeDate', 'desc'));

    // 添加篩選條件
    if (changeReason) {
      q = query(q, where('changeReason', '==', changeReason));
    }
    if (operatorId) {
      q = query(q, where('operatorId', '==', operatorId));
    }
    if (remarks) {
      // 使用 contains 查詢來搜尋備註內容
      q = query(q, where('remarks', '>=', remarks), where('remarks', '<=', remarks + '\uf8ff'));
    }
    if (startDate) {
      q = query(q, where('changeDate', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      q = query(q, where('changeDate', '<=', Timestamp.fromDate(endDate)));
    }

    // 分頁處理
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const records: InventoryRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        changeDate: data.changeDate.toDate(),
        changeReason: data.changeReason,
        operatorId: data.operatorId,
        operatorName: data.operatorName,
        remarks: data.remarks,
        relatedDocumentId: data.relatedDocumentId,
        relatedDocumentType: data.relatedDocumentType,
        details: data.details || [],
        createdAt: data.createdAt.toDate()
      });
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    const hasMore = querySnapshot.docs.length === pageSize;

    return {
      records,
      lastDoc: lastVisible,
      hasMore
    };
  } catch (error) {
    console.error('查詢庫存紀錄失敗:', error);
    throw new Error(`查詢庫存紀錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 查詢特定物料的庫存歷史（包含該物料參與的所有動作）
 */
export async function getItemInventoryHistory(
  itemId: string, 
  itemType: 'material' | 'fragrance',
  limitCount: number = BUSINESS_CONFIG.ui.pagination.itemsPerPage * 2
): Promise<InventoryRecord[]> {
  try {
    if (!db) {
      throw new Error('Firebase 未初始化');
    }

    // 查詢包含該物料的所有動作紀錄
    const q = query(
      collection(db, 'inventory_records'),
      orderBy('changeDate', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    
    const records: InventoryRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const details = data.details || [];
      
      // 只返回包含指定物料的動作紀錄
      const hasTargetItem = details.some((detail: InventoryRecordDetail) => 
        detail.itemId === itemId && detail.itemType === itemType
      );
      
      if (hasTargetItem) {
        records.push({
          id: doc.id,
          changeDate: data.changeDate.toDate(),
          changeReason: data.changeReason,
          operatorId: data.operatorId,
          operatorName: data.operatorName,
          remarks: data.remarks,
          relatedDocumentId: data.relatedDocumentId,
          relatedDocumentType: data.relatedDocumentType,
          details: details,
          createdAt: data.createdAt.toDate()
        });
      }
    });

    return records;
  } catch (error) {
    console.error('查詢物料庫存歷史失敗:', error);
    throw new Error(`查詢物料庫存歷史失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 根據變動原因建立庫存紀錄的輔助函數（支援批量操作）
 */
export async function createInventoryRecordByReason(
  reason: 'purchase' | 'workorder' | 'inventory_check' | 'manual_adjustment',
  actionData: {
    operatorId: string;
    operatorName: string;
    remarks?: string;
    relatedDocumentId?: string;
    relatedDocumentType?: string;
    details: InventoryRecordDetail[]; // 該動作影響的所有物料/香精明細
  }
): Promise<string> {
  const record: Omit<InventoryRecord, 'id' | 'createdAt'> = {
    changeDate: new Date(),
    changeReason: reason,
    ...actionData
  };

  return createInventoryRecord(record);
}

/**
 * 建立單項庫存變動紀錄（用於直接修改等單項操作）
 */
export async function createSingleItemInventoryRecord(
  reason: 'manual_adjustment',
  itemData: {
    itemType: 'material' | 'fragrance';
    itemId: string;
    itemCode: string;
    itemName: string;
    quantityChange: number;
    quantityAfter: number;
    operatorId: string;
    operatorName: string;
    remarks?: string;
  }
): Promise<string> {
  const detail: InventoryRecordDetail = {
    itemId: itemData.itemId,
    itemType: itemData.itemType,
    itemCode: itemData.itemCode,
    itemName: itemData.itemName,
    quantityChange: itemData.quantityChange,
    quantityAfter: itemData.quantityAfter
  };

  return createInventoryRecordByReason(reason, {
    operatorId: itemData.operatorId,
    operatorName: itemData.operatorName,
    remarks: itemData.remarks,
    details: [detail]
  });
}

/**
 * 獲取變動原因的中文描述
 */
export function getChangeReasonLabel(reason: string): string {
  const reasonLabels: Record<string, string> = {
    purchase: '採購購入',
    workorder: '工單領料',
    inventory_check: '庫存盤點',
    manual_adjustment: '直接修改'
  };
  return reasonLabels[reason] || reason;
}

/**
 * 獲取物料類型的中文描述
 */
export function getItemTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    material: '物料',
    fragrance: '香精'
  };
  return typeLabels[type] || type;
}

/**
 * 從動作紀錄中獲取特定物料的明細
 */
export function getItemDetailFromRecord(
  record: InventoryRecord,
  itemId: string,
  itemType: 'material' | 'fragrance'
): InventoryRecordDetail | null {
  return record.details.find(detail => 
    detail.itemId === itemId && detail.itemType === itemType
  ) || null;
}
