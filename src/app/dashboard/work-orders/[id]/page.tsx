"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from 'next/image'
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, Timestamp, query, where, orderBy, deleteDoc, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { uploadImage, uploadMultipleImages } from "@/lib/imageUpload"
import { error, debug, info } from "@/utils/logger"
import { useApiClient } from "@/hooks/useApiClient"
import { useAuth } from "@/context/AuthContext"
import { findMaterialByCategory } from "@/lib/systemConfig"
import { Material, Fragrance, Personnel, WorkOrder, TimeEntry, BillOfMaterialsItem } from "@/types"
import { formatQuantity, formatWeight, formatStock } from "@/utils/numberFormat"
import { 
  ArrowLeft, Edit, Save, CheckCircle, AlertCircle, Clock, Package, Users, 
  Droplets, Calculator, MessageSquare, Calendar, User, Plus, X, Loader2, Upload, Trash2,
  RefreshCw, Check, Printer, AlertTriangle, Edit2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { TimePicker } from "@/components/ui/time-picker"
import { TimeTrackingDialog } from "./TimeTrackingDialog"

interface Comment {
  id: string
  text: string
  images: string[]
  createdAt: string
  createdBy: string
}

interface WorkOrderData {
  id: string
  code: string
  productSnapshot: {
    code: string
    name: string
    seriesName?: string
    fragranceName: string
    fragranceCode: string
    nicotineMg: number
  }
  billOfMaterials: Array<{
    id: string
    name: string
    code: string
    type: 'fragrance' | 'material'
    quantity: number
    unit: string
    ratio?: number
    isCalculated: boolean
    category: 'fragrance' | 'pg' | 'vg' | 'nicotine' | 'specific' | 'common'
    usedQuantity?: number // 新增用於編輯的欄位
    currentStock?: number // 新增當前庫存數量
  }>
  targetQuantity: number
  actualQuantity: number
  status: string
  qcStatus: string
  createdAt: Timestamp
  createdByRef: any // TODO: 需要定義具體的 DocumentReference 類型
  createdByName?: string
  notes?: string
  timeRecords?: Array<{
    id: string
    personnelId: string
    personnelName: string
    workDate: string
    startTime: string
    endTime: string
    hours: number
    minutes: number
    totalMinutes: number
  }>
  comments?: Comment[]
}


const statusOptions = [
  { value: "預報", label: "預報", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "進行", label: "進行", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "完工", label: "完工", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "入庫", label: "入庫", color: "bg-purple-100 text-purple-800 border-purple-200" }
]

const qcStatusOptions = [
  { value: "未檢驗", label: "未檢驗", color: "bg-gray-100 text-gray-800" },
  { value: "檢驗中", label: "檢驗中", color: "bg-blue-100 text-blue-800" },
  { value: "檢驗通過", label: "檢驗通過", color: "bg-green-100 text-green-800" },
  { value: "檢驗失敗", label: "檢驗失敗", color: "bg-red-100 text-red-800" }
]

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workOrderId = params.id as string
  const apiClient = useApiClient()
  const { appUser } = useAuth()

  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null)
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTimeTrackingOpen, setIsTimeTrackingOpen] = useState(false)
  const [editData, setEditData] = useState({
    status: "",
    qcStatus: "",
    actualQuantity: 0,
    targetQuantity: 0,
    notes: ""
  })
  
  // 留言相關狀態
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [isEditingQuantity, setIsEditingQuantity] = useState(false)
  const [editingQuantities, setEditingQuantities] = useState<{[key: string]: number}>({})

  // 新增狀態：完工確認對話框
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false)
  const [isWarehousing, setIsWarehousing] = useState(false)

  // 快速編輯工時相關狀態
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null)
  const [quickEditData, setQuickEditData] = useState({
    startDate: '',
    startTime: '',
    endTime: ''
  })

  // 使用統一的格式化函數
  // const formatStock = formatQuantity; // 直接使用統一函數

  // 處理使用數量更新
  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = Math.max(0, parseFloat(parseFloat(value || '0').toFixed(3))); // 確保不是負數
    setEditingQuantities(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  // 保存使用數量更新
  const handleSaveQuantities = async () => {
    if (!workOrder || !db) return;

    try {
      // 🔍 診斷日誌：保存前的編輯數量
      console.log('🔍 [保存診斷] 編輯中的數量:', editingQuantities);

      const updatedBillOfMaterials = workOrder.billOfMaterials.map(item => {
        const newUsedQuantity = editingQuantities[item.id] !== undefined ?
          Math.max(0, parseFloat(editingQuantities[item.id].toFixed(3))) :
          (item.usedQuantity !== undefined ? Math.max(0, parseFloat(item.usedQuantity.toFixed(3))) : Math.max(0, parseFloat((item.quantity || 0).toFixed(3))));

        // 特別診斷香精項目
        if (item.type === 'fragrance' || item.category === 'fragrance') {
          console.log('🔍 [保存診斷] 香精保存詳情:', {
            id: item.id,
            name: item.name,
            originalUsedQuantity: item.usedQuantity,
            editingValue: editingQuantities[item.id],
            finalUsedQuantity: newUsedQuantity
          });
        }

        return {
          ...item,
          usedQuantity: newUsedQuantity
        };
      });

      // 🔍 診斷日誌：保存到Firestore前的最終數據
      console.log('🔍 [保存診斷] 即將保存到Firestore的BOM數據:');
      updatedBillOfMaterials.forEach((item, index) => {
        if (item.type === 'fragrance' || item.category === 'fragrance') {
          console.log(`🔍 [保存診斷] 香精[${index}] 最終數據:`, {
            id: item.id,
            name: item.name,
            usedQuantity: item.usedQuantity
          });
        }
      });

      const docRef = doc(db, "workOrders", workOrderId);
      await updateDoc(docRef, {
        billOfMaterials: updatedBillOfMaterials,
        updatedAt: Timestamp.now()
      });

      console.log('🔍 [保存診斷] Firestore更新完成');

      // 更新本地狀態
      setWorkOrder(prev => prev ? {
        ...prev,
        billOfMaterials: updatedBillOfMaterials
      } : null);

      // 清空編輯狀態
      setEditingQuantities({});
      setIsEditingQuantity(false);
      
      toast.success("使用數量已更新");
    } catch (err) {
      error("更新使用數量失敗", err as Error);
      toast.error("更新使用數量失敗");
    }
  };

  // 根據目標產量重新計算BOM表需求數量
  const recalculateBOMQuantities = (newTargetQuantity: number) => {
    if (!workOrder) return [];

    return workOrder.billOfMaterials.map(item => {
      if (['fragrance', 'pg', 'vg', 'nicotine'].includes(item.category) && item.ratio) {
        // 重新計算核心配方物料的需求數量
        const newQuantity = parseFloat((newTargetQuantity * (item.ratio / 100)).toFixed(3));
        return {
          ...item,
          quantity: newQuantity,
          usedQuantity: item.usedQuantity !== undefined ? Math.max(0, parseFloat(item.usedQuantity.toFixed(3))) : Math.max(0, parseFloat(newQuantity.toFixed(3))) // 保留已設定的使用數量，包括 0，並確保不是負數
        };
      }
      return item;
    });
  };

  // 處理目標產量變更
  const handleTargetQuantityChange = (newTargetQuantity: number) => {
    setEditData(prev => ({ ...prev, targetQuantity: newTargetQuantity }));
    
    // 同時更新BOM表的需求數量
    const updatedBOM = recalculateBOMQuantities(newTargetQuantity);
    setWorkOrder(prev => prev ? {
      ...prev,
      billOfMaterials: updatedBOM
    } : null);
  };

  // 處理工單狀態變更
  const handleStatusChange = (newStatus: string) => {
    // 只允許在預報和進行之間切換
    if (workOrder?.status === '預報' && newStatus === '進行') {
      setEditData(prev => ({ ...prev, status: newStatus }));
    } else if (workOrder?.status === '進行' && newStatus === '預報') {
      setEditData(prev => ({ ...prev, status: newStatus }));
    } else {
      toast.error("工單狀態只能在預報和進行之間切換");
    }
  };

  // 處理完工操作
  const handleComplete = () => {
    setIsCompleteDialogOpen(true);
  };

  // 確認完工 - 使用統一API
  const handleConfirmComplete = async () => {
    if (!workOrder) return;

    setIsCompleting(true);
    try {
      // 🔍 診斷日誌：檢查所有 BOM 項目
      console.log('🔍 [診斷] 工單完工前的 BOM 檢查:');
      console.log('🔍 [診斷] 總BOM項目數:', workOrder.billOfMaterials.length);
      console.log('🔍 [診斷] 工單完整資料:', {
        id: workOrderId,
        status: workOrder.status,
        targetQuantity: workOrder.targetQuantity,
        productSnapshot: workOrder.productSnapshot
      });

      workOrder.billOfMaterials.forEach((item, index) => {
        console.log(`🔍 [診斷] BOM[${index}]:`, {
          id: item.id,
          name: item.name,
          type: item.type,
          category: item.category,
          usedQuantity: item.usedQuantity,
          quantity: item.quantity,
          isFragrance: item.type === 'fragrance' || item.category === 'fragrance'
        });
      });

      // 🚨 如果BOM項目數少於3個，說明BOM表不完整
      if (workOrder.billOfMaterials.length < 3) {
        console.error('🚨 [診斷] 警告：BOM表項目數過少！可能需要重新載入BOM表');
        console.error('🚨 [診斷] 正常情況下應有：香精 + PG + VG + 尼古丁 至少4個項目');

        // 自動提示用戶
        if (confirm('⚠️ 偵測到 BOM 表項目數異常（少於3個），這可能導致扣庫存失敗。\n\n是否要重新載入 BOM 表？')) {
          console.log('🔧 [診斷] 用戶同意重新載入BOM表');
          setIsCompleting(false);
          await handleReloadBOM();
          return;
        }
      }

      // 準備物料消耗資料
      const materialsToUpdate = workOrder.billOfMaterials.filter(item => (item.usedQuantity || 0) > 0);
      console.log('🔍 [診斷] 過濾後有使用量的項目數:', materialsToUpdate.length);

      const fragranceItems = materialsToUpdate.filter(item => item.type === 'fragrance' || item.category === 'fragrance');
      console.log('🔍 [診斷] 香精項目數:', fragranceItems.length);
      fragranceItems.forEach((item, index) => {
        console.log(`🔍 [診斷] 香精[${index}]:`, {
          id: item.id,
          name: item.name,
          usedQuantity: item.usedQuantity
        });
      });

      // 🔧 修復：將所有物料（包含香精）都傳送給後端
      const consumedMaterials = materialsToUpdate.map(item => ({
        materialId: item.id,
        materialType: item.type === 'fragrance' || item.category === 'fragrance' ? 'fragrance' : 'material',
        consumedQuantity: item.usedQuantity || 0
      }));
      console.log('🔍 [診斷] 傳送給後端的物料消耗數據:', consumedMaterials);

      // 呼叫統一API完成工單
      const result = await apiClient.call('completeWorkOrder', {
        workOrderId: workOrderId,
        actualQuantity: workOrder.targetQuantity,
        consumedMaterials: consumedMaterials
      });

      if (result.success) {
        // 更新本地狀態
        setWorkOrder(prev => prev ? {
          ...prev,
          status: "完工"
        } : null);

        setIsCompleteDialogOpen(false);
        setIsEditing(false);
        toast.success("工單已完工，庫存已扣除");
      } else {
        throw new Error(result.error?.message || '完工操作失敗');
      }
    } catch (err) {
      error("完工操作失敗", err as Error);
      toast.error("完工操作失敗");
    } finally {
      setIsCompleting(false);
    }
  };

  // 處理入庫操作
  const handleWarehouse = () => {
    setIsWarehouseDialogOpen(true);
  };

  // 確認入庫處理
  const handleConfirmWarehouse = async () => {
    if (!workOrder || !db) return;
    
    setIsWarehousing(true);
    try {
      const docRef = doc(db, "workOrders", workOrderId);
      await updateDoc(docRef, {
        status: "入庫",
        updatedAt: Timestamp.now()
      });

      setWorkOrder(prev => prev ? {
        ...prev,
        status: "入庫"
      } : null);

      setIsWarehouseDialogOpen(false);
      toast.success("工單已入庫");
    } catch (err) {
      error("入庫操作失敗", err as Error);
      toast.error("入庫操作失敗");
    } finally {
      setIsWarehousing(false);
    }
  };

  // 獲取頂部按鈕文字
  const getTopButtonText = () => {
    if (!workOrder) return "完工";
    
    if (workOrder.status === "預報" || workOrder.status === "進行") {
      return "完工";
    } else if (workOrder.status === "完工") {
      return "入庫";
    }
    return "完工";
  };

  // 獲取頂部按鈕點擊處理函數
  const getTopButtonHandler = () => {
    if (!workOrder) return () => {};
    
    if (workOrder.status === "預報" || workOrder.status === "進行") {
      return handleComplete;
    } else if (workOrder.status === "完工") {
      return handleWarehouse;
    }
    return () => {};
  };

  // 檢查是否顯示頂部按鈕
  const shouldShowTopButton = () => {
    if (!workOrder) return false;
    return workOrder.status === "預報" || workOrder.status === "進行" || workOrder.status === "完工";
  };

  // 檢查是否可以編輯
  const canEdit = () => {
    if (!workOrder) return false;
    return workOrder.status === "預報" || workOrder.status === "進行";
  };

  // 檢查是否可以編輯數量
  const canEditQuantity = () => {
    if (!workOrder) return false;
    return workOrder.status === "預報" || workOrder.status === "進行";
  };


  // 檢查是否可以新增留言
  const canAddComment = () => {
    return true; // 任何狀態都可以新增留言
  };

  // 載入工時記錄
  const loadTimeEntries = useCallback(async () => {
    if (!workOrderId || !db) {
      console.warn('載入工時記錄條件不滿足:', { workOrderId: !!workOrderId, db: !!db });
      return;
    }
    
    try {
      console.log('開始載入工時記錄，workOrderId:', workOrderId);
      // 移除 orderBy 以避免 Firestore 索引問題，改為在客戶端排序
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('workOrderId', '==', workOrderId)
      );
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      console.log('工時記錄查詢結果:', timeEntriesSnapshot.size, '筆記錄');
      
      const entries = timeEntriesSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('工時記錄詳情:', { 
          id: doc.id,
          workOrderId: data.workOrderId,
          personnelId: data.personnelId,
          personnelName: data.personnelName,
          duration: data.duration,
          startDate: data.startDate,
          workDate: data.workDate
        });
        return {
          id: doc.id,
          ...data,
          workOrderNumber: data.workOrderNumber || workOrder?.code || '', // 確保工時記錄有工單號碼
        };
      });
      
      // 按工作日期和開始時間排序（最新的在上面）
      entries.sort((a: any, b: any) => {
        // 優先按創建時間排序，如果沒有創建時間則按工作日期和時間
        if (a.createdAt && b.createdAt) {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        } else {
          const dateA = new Date(`${a.startDate}T${a.startTime}`);
          const dateB = new Date(`${b.startDate}T${b.startTime}`);
          return dateB.getTime() - dateA.getTime();
        }
      });
      
      console.log('設置工時記錄，共', entries.length, '筆');
      setTimeEntries(entries);
    } catch (err) {
      console.error('載入工時記錄失敗:', err);
      error('載入工時記錄失敗', err as Error);
    }
  }, [workOrderId, workOrder?.code]);

  // 快速編輯工時記錄
  const handleQuickEditTimeEntry = (entry: any) => {
    setEditingTimeEntryId(entry.id);
    setQuickEditData({
      startDate: entry.startDate,
      startTime: entry.startTime,
      endTime: entry.endTime
    });
  };

  // 儲存快速編輯
  const handleSaveQuickEdit = async () => {
    if (!editingTimeEntryId || !db) return;
    
    try {
      const duration = calculateTimeDuration(quickEditData.startTime, quickEditData.endTime);
      await updateDoc(doc(db, 'timeEntries', editingTimeEntryId), {
        startDate: quickEditData.startDate,
        startTime: quickEditData.startTime,
        endTime: quickEditData.endTime,
        duration: duration,
        overtimeHours: Math.max(0, duration - 8),
        updatedAt: Timestamp.now()
      });
      
      setEditingTimeEntryId(null);
      toast.success('工時記錄已更新');
      loadTimeEntries();
    } catch (err) {
      console.error('更新工時記錄失敗:', err);
      toast.error('更新工時記錄失敗');
    }
  };

  // 取消編輯
  const handleCancelQuickEdit = () => {
    setEditingTimeEntryId(null);
    setQuickEditData({ startDate: '', startTime: '', endTime: '' });
  };

  // 刪除工時記錄
  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!db) return;
    
    const confirmDelete = window.confirm('確定要刪除這筆工時記錄嗎？');
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, 'timeEntries', entryId));
      toast.success('工時記錄已刪除');
      loadTimeEntries();
    } catch (err) {
      console.error('刪除工時記錄失敗:', err);
      toast.error('刪除工時記錄失敗');
    }
  };

  // 計算工時差
  const calculateTimeDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60); // 轉換為小時
  };

  // 載入工單資料
  const fetchWorkOrder = useCallback(async () => {
    if (!workOrderId || !db) return;
    
    setLoading(true);
    try {
      const workOrderDoc = await getDoc(doc(db, 'workOrders', workOrderId));
      if (workOrderDoc.exists()) {
        const data = workOrderDoc.data();
        debug('工單資料載入成功', { id: workOrderId, data });
        debug('產品快照', data.productSnapshot);
        
        // 載入物料和香精的當前庫存資訊
        console.log('📦 載入物料和香精資料 (優化後)');
        
        const materialsSnapshot = await getDocs(collection(db, "materials"));
        const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
        
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[];
        const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Fragrance[];
        
        console.log('✅ 資料載入完成:', {
          materialsCount: materialsList.length,
          fragrancesCount: fragrancesList.length
        });

        // 🔍 檢查是否有重複的香精代號（只檢查代號，不檢查名稱）
        const fragrancesByCode = new Map();
        fragrancesList.forEach(fragrance => {
          const code = fragrance.code;
          if (!fragrancesByCode.has(code)) {
            fragrancesByCode.set(code, []);
          }
          fragrancesByCode.get(code).push(fragrance);
        });

        // 檢查重複的 Code（代號應該是唯一的）
        fragrancesByCode.forEach((fragrances: Fragrance[], code) => {
          if (fragrances.length > 1) {
            console.warn(`⚠️ 發現重複香精代號 ${code}:`, fragrances.map((f: Fragrance) => ({
              id: f.id,
              name: f.name,
              currentStock: f.currentStock,
              createdAt: f.createdAt,
              updatedAt: f.updatedAt
            })));
          }
        });
        
        // 分別處理物料和香精資料
        const allMaterials: (Material | Fragrance)[] = [...materialsList, ...fragrancesList];
        
        setWorkOrder({
          id: workOrderDoc.id,
          code: data.code,
          productSnapshot: {
            code: data.productSnapshot?.code || '',
            name: data.productSnapshot?.name || '',
            seriesName: data.productSnapshot?.seriesName || '未指定',
            fragranceName: data.productSnapshot?.fragranceName || '未指定',
            fragranceCode: data.productSnapshot?.fragranceCode || '未指定',
            nicotineMg: data.productSnapshot?.nicotineMg || 0,
          },
          billOfMaterials: (data.billOfMaterials || []).map((item: BillOfMaterialsItem) => {
            // 查找對應的物料或香精，獲取當前庫存
            let material: Material | Fragrance | null = null;
            
            // 查找對應的物料或香精，獲取當前庫存
            // 🚨 重要：只使用 ID 和 code 匹配，絕對不使用 name 匹配！
            // 🚨 修復：檢查 type 或 category 來判斷是否為香精
            if (item.type === 'fragrance' || item.category === 'fragrance') {
              console.log(`🔍 查找香精: BOM中的香精 ID=${item.id}, Code=${item.code}, Name=${item.name}`);
              console.log(`🔍 可用香精列表:`, fragrancesList.map(f => ({
                id: f.id,
                code: f.code,
                name: f.name,
                currentStock: f.currentStock
              })));

              // 🚨 核心修復：優先用代號匹配，代號是唯一的
              material = fragrancesList.find((f: Fragrance) =>
                f.code === item.code
              ) || null;

              // 如果代號匹配失敗，才嘗試ID匹配（向後相容）
              if (!material) {
                material = fragrancesList.find((f: Fragrance) =>
                  f.id === item.id
                ) || null;
                if (material) {
                  console.warn(`⚠️ 代號匹配失敗，使用ID匹配: ${item.code} -> ID:${material.id}`);
                }
              }

              if (material) {
                console.log(`✅ 香精精確匹配: ${item.code} -> ${material.name} (庫存: ${material.currentStock})`);
                console.log(`🔍 核心調試 - 匹配到的香精完整資料:`, {
                  id: material.id,
                  code: material.code,
                  name: material.name,
                  currentStock: material.currentStock,
                  lastStockUpdate: (material as any).lastStockUpdate,
                  updatedAt: (material as any).updatedAt,
                  createdAt: (material as any).createdAt
                });
              } else {
                console.warn(`❌ 香精匹配失敗: BOM中 ID=${item.id}, Code=${item.code} 找不到對應的香精`);
                // 不再使用名稱匹配，因為名稱可能重複
              }
            }
            
            // 如果沒找到或不是香精，從物料集合中查找
            if (!material) {
              material = materialsList.find((m: Material) => 
                m.id === item.id || 
                m.code === item.code
              ) || null;
              
              if (material) {
                console.log(`✅ 物料精確匹配: ${item.code} -> ${material.name} (庫存: ${material.currentStock})`);
              } else {
                console.warn(`❌ 物料匹配失敗: ID=${item.id}, Code=${item.code}`);
                // 除錯：顯示所有物料的 code 來診斷問題
                console.log('所有物料編號:', materialsList.map(m => ({ id: m.id, code: m.code, name: m.name })));
              }
            }
            
            // 處理舊的資料結構，確保向後相容
            return {
              id: item.id || item.materialId || '',
              name: item.name || item.materialName || '',
              code: item.code || item.materialCode || '',
              type: item.type || (item.category === 'fragrance' ? 'fragrance' : 'material'),
              quantity: item.quantity || item.requiredQuantity || 0,
              unit: item.unit || '個',
              ratio: item.ratio || 0,
              isCalculated: item.isCalculated !== undefined ? item.isCalculated : true,
              category: item.category || 'other',
              usedQuantity: item.usedQuantity !== undefined ? item.usedQuantity : (item.quantity || item.requiredQuantity || 0),
              currentStock: material ? (material.currentStock || 0) : 0
            };
          }),
          targetQuantity: data.targetQuantity || 0,
          actualQuantity: data.actualQuantity || 0,
          status: data.status || '預報',
          qcStatus: data.qcStatus || '未檢驗',
          createdAt: data.createdAt,
          createdByRef: data.createdByRef,
          createdByName: data.createdByName || '',
          notes: data.notes || '',
          timeRecords: data.timeRecords || [],
          comments: data.comments || [],
        });
        
        // 設置留言狀態
        setComments(data.comments || []);
      } else {
        toast.error('找不到工單');
        router.push('/dashboard/work-orders');
      }
    } catch (error) {
      console.error('載入工單失敗:', error);
      toast.error('載入工單失敗');
    } finally {
      setLoading(false);
    }
  }, [workOrderId, router]);

  // 載入人員資料
  const fetchPersonnel = useCallback(async () => {
    try {
      if (!db) return
      
      // 從 users 集合載入人員資料
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const personnelList = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Personnel)
        .filter((person: Personnel) => person.isActive) // 只顯示啟用狀態的人員
        .map((person: Personnel) => ({
          id: person.id,
          name: person.name,
          employeeId: person.employeeId,
        }) as Personnel)
      
      setPersonnel(personnelList)
    } catch (error) {
      console.error("載入人員資料失敗:", error)
    }
  }, [])

  // 使用成熟的圖片上傳工具
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const toastId = toast.loading("正在處理圖片...");
    
    try {
      // 檢查總檔案大小
      const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = 10 * 1024 * 1024; // 10MB 總限制
      
      if (totalSize > maxTotalSize) {
        toast.error(`總檔案大小不能超過 10MB，請選擇較小的圖片`, { id: toastId });
        return;
      }
      
      const results = await uploadMultipleImages(fileArray, {
        folder: `work-orders/${workOrderId}/comments`,
        maxSize: 2, // 每張圖片最大 2MB
        compress: true,
        quality: 0.6
      });
      
      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);
      
      // 更新已上傳的圖片列表
      if (successfulUploads.length > 0) {
        const urls = successfulUploads.map(result => result.url!);
        setUploadedImages(prev => [...prev, ...urls]);
        toast.success(`成功上傳 ${successfulUploads.length} 張圖片`, { id: toastId });
      }
      
      // 顯示失敗的圖片
      if (failedUploads.length > 0) {
        const failedNames = failedUploads.map(result => result.error).join(', ');
        toast.error(`以下圖片上傳失敗: ${failedNames}`, { id: toastId });
      }
      
    } catch (error) {
      console.error('圖片處理失敗:', error);
      toast.error(`圖片處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, { id: toastId });
    }
    
    // 清空 input 值，允許重複選擇相同檔案
    event.target.value = '';
  };

  // 移除已上傳的圖片
  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 重新載入BOM表
  const handleReloadBOM = useCallback(async () => {
    if (!workOrder || !db) return;
    
    setIsReloading(true);
    try {
      // 1. 獲取工單中的產品快照資料
      const productSnapshotData = workOrder.productSnapshot;
      console.log('重新載入BOM表 - 工單中的產品快照:', productSnapshotData);
      
      // 2. 從香精集合中獲取完整的香精配方資料
      // 🔧 修復：優先使用 fragranceId，備用 fragranceCode
      let fragranceFormulaData = null;

      // 第一優先：使用香精ID查找
      // 🔧 使用安全的屬性存取，因為舊的工單可能沒有 fragranceId
      if ((productSnapshotData as any).fragranceId) {
        console.log('重新載入BOM表 - 使用香精ID查詢:', (productSnapshotData as any).fragranceId);

        try {
          const fragranceDocRef = doc(db, "fragrances", (productSnapshotData as any).fragranceId);
          const fragranceDocSnap = await getDoc(fragranceDocRef);

          if (fragranceDocSnap.exists()) {
            fragranceFormulaData = fragranceDocSnap.data();
            console.log('重新載入BOM表 - 通過ID成功獲取香精配方資料:', {
              id: fragranceDocSnap.id,
              code: fragranceFormulaData.code,
              name: fragranceFormulaData.name,
              percentage: fragranceFormulaData.percentage,
              pgRatio: fragranceFormulaData.pgRatio,
              vgRatio: fragranceFormulaData.vgRatio
            });
          } else {
            console.warn('重新載入BOM表 - 香精ID不存在:', (productSnapshotData as any).fragranceId);
          }
        } catch (error) {
          console.error('重新載入BOM表 - 通過ID查詢香精失敗:', error);
        }
      }

      // 第二優先：使用香精代號查找（備用方案）
      if (!fragranceFormulaData && productSnapshotData.fragranceCode && productSnapshotData.fragranceCode !== '未指定') {
        console.log('重新載入BOM表 - 使用香精代號查詢:', productSnapshotData.fragranceCode);

        const fragranceQuery = query(
          collection(db, "fragrances"),
          where("code", "==", productSnapshotData.fragranceCode)
        );
        const fragranceSnapshot = await getDocs(fragranceQuery);

        if (!fragranceSnapshot.empty) {
          fragranceFormulaData = fragranceSnapshot.docs[0].data();
          console.log('重新載入BOM表 - 通過代號成功獲取香精配方資料:', {
            code: fragranceFormulaData.code,
            name: fragranceFormulaData.name,
            percentage: fragranceFormulaData.percentage,
            pgRatio: fragranceFormulaData.pgRatio,
            vgRatio: fragranceFormulaData.vgRatio
          });
        } else {
          console.log('重新載入BOM表 - 在香精集合中找不到對應的香精:', productSnapshotData.fragranceCode);
        }
      }

      if (!fragranceFormulaData) {
        console.log('重新載入BOM表 - 無法找到香精資料，ID:', (productSnapshotData as any).fragranceId, '代號:', productSnapshotData.fragranceCode);
      }
      
      // 3. 構建完整的產品資料
      // 🔧 修復：加入 fragranceId，優先使用ID進行香精匹配
      const productData = {
        name: productSnapshotData.name,
        fragranceId: (productSnapshotData as any).fragranceId, // 新增（安全存取）
        fragranceName: productSnapshotData.fragranceName, // 保留供顯示
        fragranceCode: productSnapshotData.fragranceCode,
        nicotineMg: productSnapshotData.nicotineMg,
        fragranceFormula: fragranceFormulaData || null
      };
      
      console.log('重新載入BOM表 - 最終使用的產品資料:', productData);
      
      // 4. 重新計算BOM表
      const materialRequirements = await calculateMaterialRequirements(
        productData,
        workOrder.targetQuantity
      );
      
      // 5. 更新工單的BOM表，保留現有的使用數量和庫存資訊
      const existingBOM = workOrder.billOfMaterials;
      const updatedBOM = materialRequirements.map(newItem => {
        const existingItem = existingBOM.find(item => item.id === newItem.id);
        return {
          ...newItem,
          usedQuantity: existingItem?.usedQuantity !== undefined ? existingItem.usedQuantity : newItem.usedQuantity,
          currentStock: existingItem?.currentStock || newItem.currentStock || 0
        };
      });

      // 重新載入庫存資訊
      const materialsSnapshot = await getDocs(collection(db, "materials"));
      const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
      
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // 更新庫存資訊
      const finalBOM = updatedBOM.map(item => {
        let material = null;
        
        // 🚨 修復：檢查 type 或 category 來判斷是否為香精
        if (item.type === 'fragrance' || item.category === 'fragrance') {
          // 優先用代號匹配（唯一且準確）
          material = fragrancesList.find((f: Fragrance) => f.code === item.code);

          // 如果代號匹配失敗，嘗試ID匹配
          if (!material) {
            material = fragrancesList.find((f: Fragrance) => f.id === item.id);
          }
        }
        
        // 如果沒找到或不是香精，從物料集合中查找
        if (!material) {
          material = materialsList.find((m: Material) =>
            m.id === item.id ||
            m.code === item.code
          );
        }
        
        return {
          ...item,
          currentStock: material ? (material.currentStock || 0) : item.currentStock || 0
        };
      });

      const docRef = doc(db, "workOrders", workOrderId);
      await updateDoc(docRef, {
        billOfMaterials: finalBOM,
        updatedAt: Timestamp.now()
      });
      
      // 6. 重新載入工單資料
      await fetchWorkOrder();
      
      toast.success("BOM表已重新載入");
    } catch (error) {
      console.error("重新載入BOM表失敗:", error);
      toast.error("重新載入BOM表失敗");
    } finally {
      setIsReloading(false);
    }
  }, [workOrder, workOrderId, fetchWorkOrder]);

  // 計算物料需求的輔助函數 - 完全重新計算，如同建立工單時一樣
  // 🔧 修復：加入 fragranceId 支援
  const calculateMaterialRequirements = async (productData: {
    name: string;
    fragranceId?: string; // 新增
    fragranceName: string; // 保留供顯示
    fragranceCode: string;
    nicotineMg: number;
    fragranceFormula?: any;
  }, targetQuantity: number) => {
    if (!db) return [];
    
    console.log('重新載入BOM表 - 開始重新計算物料需求:', {
      productData: {
        name: productData.name,
        fragranceName: productData.fragranceName,
        fragranceCode: productData.fragranceCode,
        nicotineMg: productData.nicotineMg
      },
      targetQuantity
    });
    
    // 載入物料資料
    const materialsSnapshot = await getDocs(collection(db, "materials"));
    const materialsList = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    // 載入香精資料
    const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
    const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    // 分別處理物料和香精資料
    const allMaterials = [...materialsList, ...fragrancesList];
    console.log('重新載入BOM表 - 載入的物料列表:', materialsList.length, '個');
    console.log('重新載入BOM表 - 載入的香精列表:', fragrancesList.length, '個');
    console.log('重新載入BOM表 - 合併後的總物料列表:', allMaterials.length, '個');
    
    const materialRequirementsMap = new Map<string, any>();
    
    // 1. 檢查香精配方資料，但不因為缺少配方就停止計算
    console.log('重新載入BOM表 - 檢查香精配方資料:', productData.fragranceFormula);

    let fragranceRatios = {
      fragrance: 0,
      pg: 0,
      vg: 0
    };

    if (productData.fragranceFormula) {
      const { percentage, pgRatio, vgRatio } = productData.fragranceFormula;
      console.log('重新載入BOM表 - 香精配方資料:', { percentage, pgRatio, vgRatio });

      // 修復：即使香精比例為0，也要保留PG和VG比例
      fragranceRatios = {
        fragrance: percentage || 0,
        pg: pgRatio || 0,
        vg: vgRatio || 0
      };

      if (!percentage || percentage <= 0) {
        console.warn('重新載入BOM表 - 香精比例為0或無效，但保留PG/VG比例：', { pgRatio, vgRatio });
      }
    } else {
      console.warn('重新載入BOM表 - 沒有香精配方資料，但仍然繼續計算尼古丁和其他材料');
    }
    
    console.log('重新載入BOM表 - 最終使用的配方比例:', {
      香精: fragranceRatios.fragrance + '%',
      PG: fragranceRatios.pg + '%',
      VG: fragranceRatios.vg + '%',
      總計: (fragranceRatios.fragrance + fragranceRatios.pg + fragranceRatios.vg) + '%'
    });
    console.log('重新載入BOM表 - 最終使用香精比例:', fragranceRatios);
    
    // 2. 核心液體 (香精、PG、VG、尼古丁) - 總是添加所有核心液體
    // 香精 - 總是添加，並檢查實際庫存
    if (productData.fragranceName && productData.fragranceName !== '未指定') {
      const fragranceQuantity = targetQuantity * (fragranceRatios.fragrance / 100); // 35.7% = 0.357
      
      // 查找香精的實際庫存 - 從香精集合中查找（只用代號匹配）
      const fragranceMaterial = fragrancesList.find((f: Fragrance) =>
        f.code === productData.fragranceCode
      );
      
              console.log('重新載入BOM表 - 香精匹配結果:', {
          fragranceCode: productData.fragranceCode,
          fragranceName: productData.fragranceName,
          foundFragrance: fragranceMaterial ? {
            id: fragranceMaterial.id,
            code: fragranceMaterial.code,
            name: fragranceMaterial.name,
            currentStock: fragranceMaterial.currentStock
          } : null,
          allFragrances: fragrancesList.map((f: Fragrance) => ({ code: f.code, name: f.name, currentStock: f.currentStock }))
        });
      
      const currentStock = fragranceMaterial ? (fragranceMaterial.currentStock || 0) : 0;
      const hasEnoughStock = currentStock >= fragranceQuantity;
      
      // 總是添加香精，即使沒有找到對應的物料記錄
      // 🔧 修復：如果找不到香精，不應該使用代號作為ID
      const fragranceId = fragranceMaterial ? fragranceMaterial.id : `temp_fragrance_${Date.now()}`;

      materialRequirementsMap.set('fragrance', {
        id: fragranceId,
        name: productData.fragranceName,
        code: productData.fragranceCode,
        type: 'fragrance',
        quantity: fragranceQuantity,
        unit: 'KG',
        ratio: fragranceRatios.fragrance, // 直接儲存香精詳情中的原始百分比值
        isCalculated: true,
        category: 'fragrance',
        usedQuantity: fragranceQuantity,
        currentStock: currentStock,
        // 添加標記：是否找到實際的香精記錄
        isMatched: !!fragranceMaterial
      });
      console.log('重新載入BOM表 - 添加香精:', productData.fragranceName, fragranceQuantity, '比例:', fragranceRatios.fragrance, '庫存:', currentStock, '充足:', hasEnoughStock);
    } else {
      console.log('重新載入BOM表 - 香精名稱未指定或為空，跳過香精添加');
    }
    
    // PG (丙二醇) - 使用系統配置查找
    const pgMaterial = findMaterialByCategory(allMaterials, 'pg');
    if (pgMaterial) {
      const pgQuantity = targetQuantity * (fragranceRatios.pg / 100); // 24.3% = 0.243
      materialRequirementsMap.set(pgMaterial.id, {
        id: pgMaterial.id,
        name: pgMaterial.name,
        code: pgMaterial.code,
        type: 'material',
        quantity: pgQuantity,
        unit: pgMaterial.unit || 'KG',
        ratio: fragranceRatios.pg, // 直接儲存香精詳情中的原始百分比值
        isCalculated: true,
        category: 'pg',
        usedQuantity: pgQuantity,
        currentStock: pgMaterial.currentStock || 0
      });
      console.log('重新載入BOM表 - 添加PG:', pgMaterial.name, pgQuantity, '比例:', fragranceRatios.pg, '庫存:', pgMaterial.currentStock);
    } else {
      console.warn('重新載入BOM表 - 找不到PG物料');
    }
    
    // VG (甘油) - 使用系統配置查找
    const vgMaterial = findMaterialByCategory(allMaterials, 'vg');
    if (vgMaterial) {
      const vgQuantity = targetQuantity * (fragranceRatios.vg / 100); // 40% = 0.4
      materialRequirementsMap.set(vgMaterial.id, {
        id: vgMaterial.id,
        name: vgMaterial.name,
        code: vgMaterial.code,
        type: 'material',
        quantity: vgQuantity,
        unit: vgMaterial.unit || 'KG',
        ratio: fragranceRatios.vg, // 直接儲存香精詳情中的原始百分比值
        isCalculated: true,
        category: 'vg',
        usedQuantity: vgQuantity,
        currentStock: vgMaterial.currentStock || 0
      });
      console.log('重新載入BOM表 - 添加VG:', vgMaterial.name, vgQuantity, '比例:', fragranceRatios.vg, '庫存:', vgMaterial.currentStock);
    } else {
      console.warn('重新載入BOM表 - 找不到VG物料');
    }
    
    // 尼古丁 - 使用系統配置查找，無論濃度多少都要添加
    const nicotineMaterial = findMaterialByCategory(allMaterials, 'nicotine');
    if (nicotineMaterial) {
      // 修復：即使濃度為0也要計算和添加尼古丁，確保正常顯示
      const nicotineConcentration = productData.nicotineMg || 0; // 確保數值存在，默認為0
      const nicotineQuantity = nicotineConcentration > 0
        ? (targetQuantity * nicotineConcentration) / 250
        : 0; // 0mg 時數量為0，但仍然要添加到BOM表中

      materialRequirementsMap.set(nicotineMaterial.id, {
        id: nicotineMaterial.id,
        name: nicotineMaterial.name,
        code: nicotineMaterial.code,
        type: 'material',
        quantity: nicotineQuantity,
        unit: nicotineMaterial.unit || 'KG',
        ratio: 0, // 尼古丁鹽不算在比例裡面
        isCalculated: true,
        category: 'nicotine',
        usedQuantity: nicotineQuantity,
        currentStock: nicotineMaterial.currentStock || 0
      });
      console.log('重新載入BOM表 - 添加尼古丁:', nicotineMaterial.name, nicotineQuantity, '濃度:', nicotineConcentration, 'mg/ml', '庫存:', nicotineMaterial.currentStock);
    }
    
    // 3. 其他材料（專屬材料和通用材料）- 根據實際需求計算
          // 專屬材料 - 保持原有的專屬材料，但不配置需求量
      console.log('重新載入BOM表 - 專屬材料名稱:', workOrder?.billOfMaterials?.filter(item => item.category === 'specific').map(item => item.name));
      const existingSpecificMaterials = workOrder?.billOfMaterials?.filter(item => item.category === 'specific') || [];
      existingSpecificMaterials.forEach(item => {
        // 查找對應的物料，獲取當前庫存（只用ID或代號匹配）
        const material = materialsList.find((m: Material) =>
          m.id === item.id ||
          m.code === item.code
        );
        
        materialRequirementsMap.set(item.id, {
          ...item,
          quantity: 0, // 專屬材料不配置需求量
          usedQuantity: item.usedQuantity || 0,
          currentStock: material ? (material.currentStock || 0) : (item.currentStock || 0)
        });
        console.log('重新載入BOM表 - 保持專屬材料:', item.name, '需求量: 0', item.unit, '庫存:', material ? material.currentStock : item.currentStock);
      });
      
      // 通用材料 - 保持原有的通用材料，但不配置需求量
      console.log('重新載入BOM表 - 通用材料名稱:', workOrder?.billOfMaterials?.filter(item => item.category === 'common').map(item => item.name));
      const existingCommonMaterials = workOrder?.billOfMaterials?.filter(item => item.category === 'common') || [];
      existingCommonMaterials.forEach(item => {
        // 查找對應的物料，獲取當前庫存（只用ID或代號匹配）
        const material = materialsList.find((m: Material) =>
          m.id === item.id ||
          m.code === item.code
        );
        
        materialRequirementsMap.set(item.id, {
          ...item,
          quantity: 0, // 通用材料不配置需求量
          usedQuantity: item.usedQuantity || 0,
          currentStock: material ? (material.currentStock || 0) : (item.currentStock || 0)
        });
        console.log('重新載入BOM表 - 保持通用材料:', item.name, '需求量: 0', item.unit, '庫存:', material ? material.currentStock : item.currentStock);
      });
    
    // 轉換為陣列並排序
    const finalRequirements = Array.from(materialRequirementsMap.values());
    
    // 排序：香精、PG、VG、尼古丁優先，然後按類別和名稱排序
    finalRequirements.sort((a, b) => {
      const categoryOrder = ['fragrance', 'pg', 'vg', 'nicotine', 'specific', 'common', 'other'];
      const categoryA = categoryOrder.indexOf(a.category || 'other');
      const categoryB = categoryOrder.indexOf(b.category || 'other');
      
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    console.log('重新載入BOM表 - 最終物料需求:', finalRequirements);
    return finalRequirements;
  };

  // 新增留言
  const handleAddComment = async () => {
    if (!newComment.trim() && uploadedImages.length === 0) {
      toast.error("請輸入留言內容或上傳圖片");
      return;
    }

    if (!workOrder || !db) return;

    try {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        images: uploadedImages,
        createdAt: new Date().toISOString(),
        createdBy: appUser?.name || "未知用戶"
      };

      // 更新工單文檔
      const docRef = doc(db, "workOrders", workOrderId);
      const updatedComments = [...comments, comment];
      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: Timestamp.now()
      });

      // 更新本地狀態
      setComments(updatedComments);
      setWorkOrder(prev => prev ? { ...prev, comments: updatedComments } : null);
      
      // 清空表單
      setNewComment('');
      setUploadedImages([]);
      
      toast.success("留言已新增");
    } catch (error) {
      console.error("新增留言失敗:", error);
      toast.error("新增留言失敗");
    }
  };

  // 刪除留言
  const handleDeleteComment = async (commentId: string) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      // 刪除相關圖片
      if (comment.images.length > 0) {
        const { getStorage, ref, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        
        const deletePromises = comment.images.map(async (imageURL) => {
          try {
            const imageRef = ref(storage, imageURL);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('刪除圖片失敗:', error);
          }
        });
        
        await Promise.all(deletePromises);
      }

      // 從本地狀態中移除留言
      const updatedComments = comments.filter(c => c.id !== commentId);
      setComments(updatedComments);
      
      // 更新工單文檔
      if (workOrder && db) {
        const docRef = doc(db, "workOrders", workOrderId);
        await updateDoc(docRef, {
          comments: updatedComments,
          updatedAt: Timestamp.now()
        });
        
        setWorkOrder(prev => prev ? { ...prev, comments: updatedComments } : null);
      }
      
      toast.success('留言已刪除');
    } catch (error) {
      console.error('刪除留言失敗:', error);
      toast.error('刪除留言失敗');
    }
  };

  // 刪除整個工單
  const handleDeleteWorkOrder = async () => {
    if (!workOrder || !db) {
      console.error('缺少必要資料:', { workOrder: !!workOrder, db: !!db });
      toast.error('缺少必要資料，無法刪除工單');
      return;
    }
    
    setIsDeleting(true);
    const toastId = toast.loading("正在刪除工單...");
    
    try {
      console.log('開始刪除工單:', workOrder.id);
      
      // 1. 刪除所有留言的圖片
      const allImages = comments.flatMap(comment => comment.images);
      console.log('需要刪除的圖片數量:', allImages.length);
      
      if (allImages.length > 0) {
        const { getStorage, ref, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        
        const deleteImagePromises = allImages.map(async (imageURL, index) => {
          try {
            console.log(`刪除圖片 ${index + 1}/${allImages.length}:`, imageURL);
            const imageRef = ref(storage, imageURL);
            await deleteObject(imageRef);
            console.log(`圖片 ${index + 1} 刪除成功`);
          } catch (error) {
            console.error(`刪除圖片 ${index + 1} 失敗:`, error);
            // 不中斷整個流程，繼續刪除其他圖片
          }
        });
        
        await Promise.all(deleteImagePromises);
        console.log('所有圖片刪除完成');
      }

      // 2. 刪除工單文檔
      console.log('刪除工單文檔:', workOrder.id);
      const { doc, deleteDoc } = await import('firebase/firestore');
      const workOrderRef = doc(db, 'workOrders', workOrder.id);
      await deleteDoc(workOrderRef);
      console.log('工單文檔刪除成功');

      toast.success("工單已刪除", { id: toastId });
      console.log('刪除完成，準備跳轉到工單列表');
      
      // 3. 返回工單列表頁面
      router.push('/dashboard/work-orders');
      
    } catch (error) {
      console.error("刪除工單失敗:", error);
      toast.error(`刪除工單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, { id: toastId });
    } finally {
      console.log('清理狀態');
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    fetchWorkOrder()
    fetchPersonnel()
    loadTimeEntries()
  }, [fetchWorkOrder, fetchPersonnel, loadTimeEntries])


  // 初始化編輯資料
  const handleStartEditing = () => {
    if (!workOrder) return;
    
    setEditData({
      status: workOrder.status,
      qcStatus: workOrder.qcStatus,
      actualQuantity: workOrder.actualQuantity,
      targetQuantity: workOrder.targetQuantity,
      notes: workOrder.notes || ""
    });
    setIsEditing(true);
  };

  // 儲存編輯資料
  const handleSave = async () => {
    if (!workOrder || !db) return

    setIsSaving(true)
    try {
      // 重新計算BOM表需求數量
      const updatedBOM = recalculateBOMQuantities(editData.targetQuantity);
      
      const docRef = doc(db, "workOrders", workOrderId)
      await updateDoc(docRef, {
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        targetQuantity: editData.targetQuantity,
        notes: editData.notes,
        billOfMaterials: updatedBOM,
        updatedAt: Timestamp.now()
      })

      setWorkOrder(prev => prev ? {
        ...prev,
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        targetQuantity: editData.targetQuantity,
        notes: editData.notes,
        billOfMaterials: updatedBOM
      } : null)

      setIsEditing(false)
      toast.success("工單資料已更新")
    } catch (error) {
      console.error("更新工單失敗:", error)
      toast.error("更新工單失敗")
    } finally {
      setIsSaving(false)
    }
  }


  // 計算總人工小時 (從 timeEntries)
  const totalWorkHours = timeEntries.reduce((total, entry) => {
    const duration = parseFloat(entry.duration) || 0;
    return total + duration;
  }, 0)
  
  const totalHours = Math.floor(totalWorkHours)
  const totalMinutes = Math.floor((totalWorkHours % 1) * 60)

  // 列印功能
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('無法開啟列印視窗，請檢查彈出視窗設定');
      return;
    }

    const printContent = generatePrintContent();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // 等待內容載入完成後列印
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // 生成列印內容
  const generatePrintContent = () => {
    if (!workOrder) return '';

    // 使用統一的格式化函數
    const formatStock = formatQuantity;

    const formatDate = (date: any) => {
      if (!date) return '';
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('zh-TW', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    };

    const coreMaterials = workOrder.billOfMaterials.filter(item => 
      ['fragrance', 'pg', 'vg', 'nicotine'].includes(item.category)
    );
    const specificMaterials = workOrder.billOfMaterials.filter(item => 
      item.category === 'specific'
    );
    const commonMaterials = workOrder.billOfMaterials.filter(item => 
      item.category === 'common'
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>工單列印 - ${workOrder.code}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 0.5cm;
            }
          }
          
                     body {
             font-family: 'Microsoft JhengHei', Arial, sans-serif;
             margin: 0;
             padding: 20px;
             font-size: 20px;
             line-height: 1.4;
             color: #000;
           }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 3px solid #000;
            padding-bottom: 8px;
          }
          
                     .title {
             font-size: 36px;
             font-weight: bold;
             margin-bottom: 10px;
           }
           
           .subtitle {
             font-size: 28px;
             font-weight: bold;
             margin-bottom: 15px;
           }
          
                                .top-info {
             display: grid;
             grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
             gap: 8px;
             margin-bottom: 12px;
           }
           
           .top-info-item {
             border: 3px solid #000;
             padding: 12px;
             text-align: center;
             border-radius: 5px;
             background-color: #f8f8f8;
           }
           
           .top-info-label {
             font-size: 18px;
             font-weight: bold;
             margin-bottom: 8px;
             color: #333;
           }
           
           .top-info-value {
             font-size: 22px;
             font-weight: bold;
             color: #000;
           }
           
           .main-content {
             display: block;
             margin-bottom: 15px;
           }
           
           .materials-section {
             margin-bottom: 15px;
           }
           
           .materials-section h3 {
             font-size: 44px;
             font-weight: bold;
             margin: 0 0 12px 0;
             text-align: center;
             background-color: #f0f0f0;
             padding: 10px;
             border-radius: 3px;
           }
           
          
                     .materials-section {
             margin-bottom: 15px;
           }
           
           .materials-section h3 {
             font-size: 44px;
             font-weight: bold;
             margin: 0 0 12px 0;
             text-align: center;
             background-color: #f0f0f0;
             padding: 10px;
             border-radius: 3px;
           }
          
                     table {
             width: 100%;
             border-collapse: collapse;
             margin-bottom: 15px;
             font-size: 36px;
           }
           
           th, td {
             border: 4px solid #000;
             padding: 15px 10px;
             text-align: center;
             line-height: 1.6;
           }
           
           th {
             background-color: #f0f0f0;
             font-weight: bold;
             font-size: 40px;
           }
          
                     .time-section {
             margin-bottom: 15px;
           }
           
           .time-section h3 {
             font-size: 48px;
             font-weight: bold;
             margin: 0 0 12px 0;
             text-align: center;
             background-color: #f0f0f0;
             padding: 10px;
             border-radius: 3px;
           }
           
           .memo-writing-box {
             border: 4px solid #000;
             background-color: #f9f9f9;
             min-height: 280px;
             margin-top: 12px;
           }
          
          
          
          .page-break {
            page-break-before: always;
          }
          
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">生產工單</div>
          <div class="subtitle">${workOrder.code}</div>
          <div>列印日期：${new Date().toLocaleDateString('zh-TW', {
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}</div>
        </div>
        
                 <div class="top-info">
           <div class="top-info-item">
             <div class="top-info-label">產品系列</div>
             <div class="top-info-value">${workOrder.productSnapshot.seriesName || '未指定'}</div>
           </div>
           <div class="top-info-item">
             <div class="top-info-label">產品名稱</div>
             <div class="top-info-value">${workOrder.productSnapshot.name}</div>
           </div>
           <div class="top-info-item">
             <div class="top-info-label">香精代號</div>
             <div class="top-info-value">${workOrder.productSnapshot.fragranceCode}</div>
           </div>
           <div class="top-info-item">
             <div class="top-info-label">尼古丁濃度</div>
             <div class="top-info-value">${workOrder.productSnapshot.nicotineMg} mg</div>
           </div>
           <div class="top-info-item">
             <div class="top-info-label">目標產量</div>
             <div class="top-info-value">${formatWeight(workOrder.targetQuantity)}</div>
           </div>
         </div>
        
                 <div class="main-content">
           <div class="materials-section">
             <h3>核心配方物料清單</h3>
             <table>
               <thead>
                 <tr>
                   <th>物料名稱</th>
                   <th>料件代號</th>
                   <th>比例</th>
                   <th>需求數量</th>
                   <th>使用數量</th>
                   <th>單位</th>
                 </tr>
               </thead>
               <tbody>
                 ${coreMaterials.map(item => `
                   <tr>
                                        <td style="font-weight: bold; font-size: 36px;">${item.name}</td>
                   <td style="font-weight: bold; font-size: 36px;">${item.code}</td>
                   <td style="font-size: 36px;">${item.ratio ? item.ratio + '%' : '-'}</td>
                   <td style="font-weight: bold; font-size: 36px;">${formatQuantity(item.quantity)}</td>
                   <td style="border: 2px solid #000; background-color: #f9f9f9; min-width: 120px; height: 60px;"></td>
                   <td style="font-size: 36px;">${item.unit}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
             
             ${specificMaterials.length > 0 ? `
             <h3>產品專屬物料</h3>
             <table>
               <thead>
                 <tr>
                   <th>物料名稱</th>
                   <th>料件代號</th>
                   <th>使用數量</th>
                   <th>單位</th>
                 </tr>
               </thead>
               <tbody>
                 ${specificMaterials.map(item => `
                   <tr>
                     <td style="font-weight: bold; font-size: 36px;">${item.name}</td>
                     <td style="font-weight: bold; font-size: 36px;">${item.code}</td>
                     <td style="border: 2px solid #000; background-color: #f9f9f9; min-width: 120px; height: 60px;"></td>
                     <td style="font-size: 36px;">${item.unit}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
             ` : ''}
             
             ${commonMaterials.length > 0 ? `
             <h3>系列通用物料</h3>
             <table>
               <thead>
                 <tr>
                   <th>物料名稱</th>
                   <th>料件代號</th>
                   <th>使用數量</th>
                   <th>單位</th>
                 </tr>
               </thead>
               <tbody>
                 ${commonMaterials.map(item => `
                   <tr>
                     <td style="font-weight: bold; font-size: 36px;">${item.name}</td>
                     <td style="font-weight: bold; font-size: 36px;">${item.code}</td>
                     <td style="border: 2px solid #000; background-color: #f9f9f9; min-width: 120px; height: 60px;"></td>
                     <td style="font-size: 36px;">${item.unit}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
             ` : ''}
           </div>
           
         </div>
        
                 <div class="time-section">
           <h3>備忘錄</h3>
           <div class="memo-writing-box">
             <!-- 備忘錄書寫區域 -->
           </div>
         </div>
        
        
                 ${workOrder.notes ? `
         <div style="margin-top: 15px; border: 1px solid #000; padding: 8px;">
           <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">備註</h3>
           <div style="font-size: 13px; white-space: pre-wrap;">${workOrder.notes}</div>
         </div>
         ` : ''}
      </body>
      </html>
         `;
   };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container mx-auto p-4 py-10">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 text-lg font-medium">載入工單資料中...</p>
              <p className="text-gray-400 text-sm mt-2">請稍候，正在獲取最新資料</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container mx-auto p-4 py-10">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">工單不存在</h2>
              <p className="text-gray-600 mb-6">找不到指定的工單，可能已被刪除或不存在</p>
              <Button 
                onClick={() => router.push("/dashboard/work-orders")}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回工單列表
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 py-4 sm:py-6 lg:py-10 max-w-7xl force-mobile-layout">
        {/* 頁面標題 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => router.back()}
              className="hover:bg-white/80 backdrop-blur-sm flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-grow min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent truncate">
                工單詳情
              </h1>
              <p className="text-gray-600 font-mono text-sm sm:text-base truncate">{workOrder.code}</p>
            </div>
          </div>
          
          {/* 按鈕組 - 手機版垂直排列 */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mobile-spacing">
            <Button 
              variant="outline"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 w-full sm:w-auto mobile-button-full mobile-text-scale"
            >
              <Printer className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">列印工單</span>
              <span className="sm:hidden">列印</span>
            </Button>
            {shouldShowTopButton() && (
              <Button 
                variant="outline"
                onClick={getTopButtonHandler()}
                className="bg-green-600 hover:bg-green-700 text-white border-green-600 w-full sm:w-auto mobile-button-full mobile-text-scale"
              >
                <Check className="mr-2 h-4 w-4" />
                {getTopButtonText()}
              </Button>
            )}
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="bg-red-500 hover:bg-red-600 w-full sm:w-auto mobile-button-full mobile-text-scale"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">刪除工單</span>
              <span className="sm:hidden">刪除</span>
            </Button>
          </div>
        </div>

      {/* 工單基本資料 */}
      <Card className="mb-4 sm:mb-6 shadow-lg border-0 bg-white">
        <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800 rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-5 w-5" />
            工單基本資料
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">生產產品名稱</div>
              <div className="font-semibold text-blue-800 text-sm sm:text-base truncate">{workOrder.productSnapshot.name}</div>
              <div className="text-xs text-gray-500 truncate">{workOrder.productSnapshot.seriesName || '未指定'}</div>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">使用香精</div>
              <div className="font-semibold text-pink-800 text-sm sm:text-base truncate">{workOrder.productSnapshot.fragranceCode}</div>
              <div className="text-xs text-gray-500 truncate">{workOrder.productSnapshot.fragranceName}</div>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">尼古丁濃度</div>
              <div className="font-semibold text-orange-800 text-sm sm:text-base">{workOrder.productSnapshot.nicotineMg} mg</div>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">工單狀態</div>
              <Badge className={`${statusOptions.find(s => s.value === workOrder.status)?.color} text-base sm:text-lg font-bold px-3 py-1`}>
                {workOrder.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 工單詳細資料 */}
      <Card className="mb-4 sm:mb-6 shadow-lg border-0 bg-white">
        <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-green-200 to-green-300 text-green-800 rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calculator className="h-5 w-5" />
            工單詳細資料
            {workOrder?.status === "入庫" && (
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800 border-purple-200">
                已入庫 - 僅可查看
              </Badge>
            )}
            {workOrder?.status === "完工" && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 border-green-200">
                已完工 - 僅可編輯工時
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm text-gray-600">目前工單狀態</Label>
              {isEditing ? (
                <Select value={editData.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter(option => {
                        // 只顯示預報和進行狀態
                        return option.value === '預報' || option.value === '進行';
                      })
                      .map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  <Badge className={`${statusOptions.find(s => s.value === workOrder.status)?.color} text-base sm:text-lg font-bold px-3 py-1`}>
                    {workOrder.status}
                  </Badge>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-600">生產產品名稱</Label>
              <div className="mt-1 font-medium text-gray-900">{workOrder.productSnapshot.name}</div>
            </div>

            <div>
              <Label className="text-sm text-gray-600">產品系列</Label>
              <div className="mt-1 font-medium text-gray-900">{workOrder.productSnapshot.seriesName || '未指定'}</div>
            </div>

            <div>
              <Label className="text-sm text-gray-600">目標產量 (KG)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editData.targetQuantity}
                  onChange={(e) => handleTargetQuantityChange(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 font-medium text-gray-900">{formatWeight(workOrder.targetQuantity)}</div>
              )}
            </div>
          </div>

          {/* 編輯按鈕 */}
          <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      儲存
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStartEditing}
                disabled={!canEdit()}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                title={!canEdit() ? "完工或入庫狀態無法編輯" : "點擊編輯工單詳細資料"}
              >
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 香精物料清單 (BOM表) */}
      <Card className="mb-4 sm:mb-6 shadow-lg border-0 bg-white">
        <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Droplets className="h-5 w-5" />
              香精物料清單 (BOM表)
              {workOrder?.status === "入庫" && (
                <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800 border-purple-200">
                  已入庫 - 僅可查看
                </Badge>
              )}
              {workOrder?.status === "完工" && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 border-green-200">
                  已完工 - 僅可編輯工時
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReloadBOM}
                disabled={isReloading}
                className="text-purple-700 border-purple-300 hover:bg-purple-50 w-full sm:w-auto"
              >
                {isReloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">重新載入</span>
              </Button>
              {isEditingQuantity ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingQuantities({});
                      setIsEditingQuantity(false);
                    }}
                    className="text-red-700 border-red-300 hover:bg-red-50 w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    取消
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveQuantities}
                    className="text-purple-700 border-purple-300 hover:bg-purple-50 w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    保存數量
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingQuantity(true)}
                  disabled={!canEditQuantity()}
                  className="text-purple-700 border-purple-300 hover:bg-purple-50 w-full sm:w-auto"
                  title={!canEditQuantity() ? "完工或入庫狀態無法編輯數量" : "點擊編輯物料使用數量"}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  編輯數量
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6">
            {/* 核心配方物料 */}
            <div>
              <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                核心配方物料
              </h3>
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <TableHead className="text-gray-700 font-bold text-xs sm:text-sm">物料名稱</TableHead>
                      <TableHead className="text-gray-700 font-bold text-xs sm:text-sm">料件代號</TableHead>
                      <TableHead className="text-gray-700 font-bold text-xs sm:text-sm">比例</TableHead>
                      <TableHead className="text-gray-700 font-bold text-xs sm:text-sm">需求數量</TableHead>
                      <TableHead className="text-gray-700 font-bold text-xs sm:text-sm">使用數量</TableHead>
                      <TableHead className="text-gray-700 font-bold text-xs sm:text-sm">單位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrder.billOfMaterials
                      .filter(item => ['fragrance', 'pg', 'vg', 'nicotine'].includes(item.category))
                      .map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50/50 transition-all duration-200">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {item.category === 'fragrance' && <Droplets className="h-4 w-4 text-purple-600" />}
                              {item.category === 'pg' && <div className="w-4 h-4 bg-blue-500 rounded" />}
                              {item.category === 'vg' && <div className="w-4 h-4 bg-green-500 rounded" />}
                              {item.category === 'nicotine' && <div className="w-4 h-4 bg-orange-500 rounded" />}
                              <span className="text-xs sm:text-sm truncate">{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs sm:text-sm">{item.code}</TableCell>
                          <TableCell>
                            {item.ratio ? `${item.ratio}%` : '-'}
                          </TableCell>
                          <TableCell className="font-medium">{formatQuantity(item.quantity)}</TableCell>
                          <TableCell>
                            {isEditingQuantity ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : (item.usedQuantity || 0)}
                                onChange={(e) => {
                                  handleQuantityChange(item.id, e.target.value);
                                }}
                                className="w-20"
                              />
                            ) : (
                              <span className="font-medium">{formatStock(item.usedQuantity || 0)}</span>
                            )}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片式佈局 */}
              <div className="md:hidden space-y-3">
                {workOrder.billOfMaterials
                  .filter(item => ['fragrance', 'pg', 'vg', 'nicotine'].includes(item.category))
                  .map((item, index) => (
                    <Card key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {item.category === 'fragrance' && (
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                <Droplets className="h-4 w-4 text-white" />
                              </div>
                            )}
                            {item.category === 'pg' && (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded" />
                              </div>
                            )}
                            {item.category === 'vg' && (
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded" />
                              </div>
                            )}
                            {item.category === 'nicotine' && (
                              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs text-gray-600 mb-1">比例</div>
                            <div className="font-medium text-purple-800">
                              {item.ratio ? `${item.ratio}%` : '-'}
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-xs text-gray-600 mb-1">需求數量</div>
                            <div className="font-medium text-gray-900">
                              {formatQuantity(item.quantity)} {item.unit}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 bg-white p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-600">使用數量</div>
                            {isEditingQuantity ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : (item.usedQuantity || 0)}
                                onChange={(e) => {
                                  handleQuantityChange(item.id, e.target.value);
                                }}
                                className="w-20 h-8 text-sm"
                              />
                            ) : (
                              <div className="font-medium text-lg text-blue-800">
                                {formatStock(item.usedQuantity || 0)} {item.unit}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* 產品專屬物料 */}
            {workOrder.billOfMaterials.filter(item => item.category === 'specific').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  產品專屬物料
                </h3>
                {/* 桌面版表格 */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <TableHead className="text-gray-700 font-bold">物料名稱</TableHead>
                        <TableHead className="text-gray-700 font-bold">料件代號</TableHead>
                        <TableHead className="text-gray-700 font-bold">使用數量</TableHead>
                        <TableHead className="text-gray-700 font-bold">單位</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workOrder.billOfMaterials
                        .filter(item => item.category === 'specific')
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item, index) => (
                          <TableRow key={index} className="hover:bg-gray-50/50 transition-all duration-200">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.code}</TableCell>
                            <TableCell>
                              {isEditingQuantity ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : (item.usedQuantity || 0)}
                                  onChange={(e) => {
                                    handleQuantityChange(item.id, e.target.value);
                                  }}
                                  className="w-20"
                                />
                              ) : (
                                <span className="font-medium">{formatStock(item.usedQuantity || 0)}</span>
                              )}
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 手機版卡片式佈局 */}
                <div className="md:hidden space-y-3">
                  {workOrder.billOfMaterials
                    .filter(item => item.category === 'specific')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item, index) => (
                      <Card key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-600">使用數量</div>
                              {isEditingQuantity ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : (item.usedQuantity || 0)}
                                  onChange={(e) => {
                                    handleQuantityChange(item.id, e.target.value);
                                  }}
                                  className="w-20 h-8 text-sm"
                                />
                              ) : (
                                <div className="font-medium text-lg text-blue-800">
                                  {formatStock(item.usedQuantity || 0)} {item.unit}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* 系列通用物料 */}
            {workOrder.billOfMaterials.filter(item => item.category === 'common').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  系列通用物料
                </h3>
                {/* 桌面版表格 */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-green-100 to-emerald-100">
                        <TableHead className="text-black font-bold">物料名稱</TableHead>
                        <TableHead className="text-black font-bold">料件代號</TableHead>
                        <TableHead className="text-black font-bold">使用數量</TableHead>
                        <TableHead className="text-black font-bold">單位</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workOrder.billOfMaterials
                        .filter(item => item.category === 'common')
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item, index) => (
                          <TableRow key={index} className="bg-gradient-to-r from-green-50 to-emerald-50">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.code}</TableCell>
                            <TableCell>
                              {isEditingQuantity ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : (item.usedQuantity || 0)}
                                  onChange={(e) => {
                                    handleQuantityChange(item.id, e.target.value);
                                  }}
                                  className="w-20"
                                />
                              ) : (
                                <span className="font-medium">{formatStock(item.usedQuantity || 0)}</span>
                              )}
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 手機版卡片式佈局 */}
                <div className="md:hidden space-y-3">
                  {workOrder.billOfMaterials
                    .filter(item => item.category === 'common')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item, index) => (
                      <Card key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-600">使用數量</div>
                              {isEditingQuantity ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : (item.usedQuantity || 0)}
                                  onChange={(e) => {
                                    handleQuantityChange(item.id, e.target.value);
                                  }}
                                  className="w-20 h-8 text-sm"
                                />
                              ) : (
                                <div className="font-medium text-lg text-green-800">
                                  {formatStock(item.usedQuantity || 0)} {item.unit}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 工時申報 */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-orange-800 flex items-center gap-2 text-lg sm:text-xl">
                <Clock className="h-5 w-5" />
                工時申報
              </CardTitle>
              <Button
                onClick={() => setIsTimeTrackingOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
              >
                <Clock className="mr-2 h-4 w-4" />
                新增工時
              </Button>
            </div>
            
            {/* 狀態標籤 */}
            <div className="flex flex-wrap gap-2">
              {workOrder?.status === "入庫" && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                  已入庫 - 無法新增
                </Badge>
              )}
              {workOrder?.status === "完工" && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  已完工 - 仍可新增
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* 工時紀錄列表 - 桌面版表格 */}
          {timeEntries && timeEntries.length > 0 ? (
            <>
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-100 to-amber-100">
                    <TableHead className="text-black font-bold text-xs sm:text-sm">人員</TableHead>
                    <TableHead className="text-black font-bold text-xs sm:text-sm">工作日期</TableHead>
                    <TableHead className="text-black font-bold text-xs sm:text-sm">開始時間</TableHead>
                    <TableHead className="text-black font-bold text-xs sm:text-sm">結束時間</TableHead>
                    <TableHead className="text-black font-bold text-xs sm:text-sm">工時小計</TableHead>
                    <TableHead className="text-black font-bold text-xs sm:text-sm">排工人員</TableHead>
                    {workOrder?.status !== "入庫" && (
                      <TableHead className="text-black font-bold text-xs sm:text-sm text-right">操作</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{entry.personnelName}</TableCell>
                      <TableCell>
                        {editingTimeEntryId === entry.id ? (
                          <Input
                            type="date"
                            value={quickEditData.startDate}
                            onChange={(e) => setQuickEditData({...quickEditData, startDate: e.target.value})}
                            className="w-32 h-8 text-xs"
                          />
                        ) : (
                          entry.startDate
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTimeEntryId === entry.id ? (
                          <Input
                            type="text"
                            value={quickEditData.startTime}
                            onChange={(e) => setQuickEditData({...quickEditData, startTime: e.target.value})}
                            className="w-20 h-8 text-xs font-mono text-center"
                            placeholder="HH:MM"
                            pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                          />
                        ) : (
                          entry.startTime
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTimeEntryId === entry.id ? (
                          <Input
                            type="text"
                            value={quickEditData.endTime}
                            onChange={(e) => setQuickEditData({...quickEditData, endTime: e.target.value})}
                            className="w-20 h-8 text-xs font-mono text-center"
                            placeholder="HH:MM"
                            pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                          />
                        ) : (
                          entry.endTime
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(() => {
                          const duration = parseFloat(entry.duration) || 0;
                          const hours = Math.floor(duration);
                          const minutes = Math.round((duration % 1) * 60);
                          return `${hours} 小時 ${minutes} 分鐘`;
                        })()}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{entry.createdByName || '未知'}</TableCell>
                      {workOrder?.status !== "入庫" && (
                        <TableCell className="text-right">
                          {editingTimeEntryId === entry.id ? (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                onClick={handleSaveQuickEdit}
                                className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelQuickEdit}
                                className="h-7 px-2 text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickEditTimeEntry(entry)}
                                className="h-7 px-2 text-xs"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteTimeEntry(entry.id)}
                                className="h-7 px-2 text-xs"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* 手機版卡片式佈局 */}
              <div className="md:hidden space-y-4">
                {timeEntries.map((entry, index) => (
                  <Card key={index} className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{entry.personnelName}</div>
                            <div className="text-xs text-gray-500">排工人員：{entry.createdByName || '未知'}</div>
                          </div>
                        </div>
                        {workOrder?.status !== "入庫" && (
                          <div className="flex gap-2">
                            {editingTimeEntryId === entry.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={handleSaveQuickEdit}
                                  className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700 text-white rounded-full"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelQuickEdit}
                                  className="h-10 w-10 p-0 rounded-full"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickEditTimeEntry(entry)}
                                  className="h-10 w-10 p-0 text-orange-600 border-orange-300 hover:bg-orange-50 rounded-full"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteTimeEntry(entry.id)}
                                  className="h-10 w-10 p-0 text-red-600 border-red-300 hover:bg-red-50 rounded-full"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">工作日期</span>
                          {editingTimeEntryId === entry.id ? (
                            <Input
                              type="date"
                              value={quickEditData.startDate}
                              onChange={(e) => setQuickEditData({...quickEditData, startDate: e.target.value})}
                              className="w-36 h-10 text-sm"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{entry.startDate}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">開始時間</span>
                            {editingTimeEntryId === entry.id ? (
                              <Input
                                type="text"
                                value={quickEditData.startTime}
                                onChange={(e) => setQuickEditData({...quickEditData, startTime: e.target.value})}
                                className="w-24 h-10 text-sm font-mono text-center"
                                placeholder="HH:MM"
                                pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                              />
                            ) : (
                              <span className="font-mono text-orange-700 font-medium">{entry.startTime}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">結束時間</span>
                            {editingTimeEntryId === entry.id ? (
                              <Input
                                type="text"
                                value={quickEditData.endTime}
                                onChange={(e) => setQuickEditData({...quickEditData, endTime: e.target.value})}
                                className="w-24 h-10 text-sm font-mono text-center"
                                placeholder="HH:MM"
                                pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                              />
                            ) : (
                              <span className="font-mono text-red-700 font-medium">{entry.endTime}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-orange-200">
                          <span className="text-sm text-gray-600">工時小計</span>
                          <div className="text-right">
                            <div className="font-bold text-lg text-orange-900">
                              {(() => {
                                const duration = parseFloat(entry.duration) || 0;
                                const hours = Math.floor(duration);
                                const minutes = Math.round((duration % 1) * 60);
                                return `${hours} 小時 ${minutes} 分鐘`;
                              })()}
                            </div>
                            {entry.overtimeHours > 0 && (
                              <div className="text-xs text-red-600">
                                加班 {Math.floor(entry.overtimeHours)} 小時 {Math.round((entry.overtimeHours % 1) * 60)} 分鐘
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>尚無工時紀錄</p>
              <p className="text-sm">點擊上方按鈕新增工時紀錄</p>
            </div>
          )}
        </CardContent>
      </Card>



      {/* 工時管理對話框 */}
      <TimeTrackingDialog
        isOpen={isTimeTrackingOpen}
        onOpenChange={(open) => {
          setIsTimeTrackingOpen(open);
          if (!open) {
            // 對話框關閉時重新載入工時記錄
            loadTimeEntries();
          }
        }}
        workOrderId={workOrderId}
        workOrderNumber={workOrder?.code}
        isLocked={workOrder?.status === "入庫"}
      />

      {/* 留言功能 */}
      <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            留言記錄
            <Badge variant="secondary" className="ml-2">
              {comments.length} 則留言
            </Badge>
            {workOrder?.status === "入庫" && (
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800 border-purple-200">
                僅可留言
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 新增留言表單 */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-yellow-200">
            <div className="mb-4">
              <Label htmlFor="comment" className="text-sm font-medium text-gray-700">
                新增留言
              </Label>
              <Textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="輸入留言內容..."
                className="mt-1 min-h-[100px] resize-none"
              />
            </div>

            {/* 圖片上傳區域 */}
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                上傳圖片
              </Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  選擇圖片
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="text-sm text-gray-500 text-center sm:text-left">
                  可選擇多張圖片 (每張最大 2MB)
                </span>
              </div>

              {/* 已上傳的圖片預覽 */}
              {uploadedImages.length > 0 && (
                <div className="mt-3">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    已選擇的圖片 ({uploadedImages.length} 張)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={imageUrl}
                          alt={`圖片 ${index + 1}`}
                          width={96}
                          height={80}
                          className="w-full h-20 sm:h-24 object-cover rounded-lg border cursor-pointer"
                          onClick={() => {
                            // 創建圖片預覽對話框
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80';
                            modal.onclick = () => modal.remove();
                            
                            const img = document.createElement('img');
                            img.src = imageUrl;
                            img.className = 'max-w-[90vw] max-h-[90vh] object-contain rounded-lg';
                            img.onclick = (e) => e.stopPropagation();
                            
                            modal.appendChild(img);
                            document.body.appendChild(modal);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() && uploadedImages.length === 0}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              新增留言
            </Button>
          </div>

          {/* 留言列表 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>尚無留言記錄</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-lg border border-yellow-200 p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 truncate">{comment.createdBy}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {comment.text && (
                    <div className="mb-3 text-gray-700 whitespace-pre-wrap break-words">
                      {comment.text}
                    </div>
                  )}

                  {comment.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {comment.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={imageUrl}
                            alt={`留言圖片 ${index + 1}`}
                            width={96}
                            height={80}
                            className="w-full h-20 sm:h-24 object-cover rounded-lg border cursor-pointer"
                            onClick={() => {
                              // 創建圖片預覽對話框
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80';
                              modal.onclick = () => modal.remove();
                              
                              const img = document.createElement('img');
                              img.src = imageUrl;
                              img.className = 'max-w-[90vw] max-h-[90vh] object-contain rounded-lg';
                              img.onclick = (e) => e.stopPropagation();
                              
                              modal.appendChild(img);
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 完工確認對話框 */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-600 text-lg sm:text-xl">確認完工</DialogTitle>
            <DialogDescription>
              請確認以下資訊後點擊完工按鈕。完工後將無法再修改目標產量和使用數量，但仍可新增工時記錄。系統會顯示庫存扣除後的剩餘數量，並實際扣除相應的庫存。
            </DialogDescription>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWorkOrder}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                重新載入庫存
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 已填寫使用數量的物料 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">已填寫使用數量的物料</h3>
              <p className="text-sm text-gray-600 mb-3">
                顯示物料的現有庫存、使用數量和扣除後的剩餘數量。
                <span className="text-blue-600">藍色</span>為現有數量，
                <span className="text-red-600">紅色</span>為使用數量，
                <span className="text-green-600">綠色</span>為剩餘數量，
                <span className="text-red-600">紅色</span>表示庫存不足。
                {loading && (
                  <span className="ml-2 text-blue-600">
                    <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                    載入庫存中...
                  </span>
                )}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                                                  <TableHead className="text-gray-700 font-bold">物料名稱</TableHead>
                            <TableHead className="text-gray-700 font-bold">料件代號</TableHead>
                            <TableHead className="text-gray-700 font-bold">現有數量</TableHead>
                            <TableHead className="text-gray-700 font-bold">使用數量</TableHead>
                            <TableHead className="text-gray-700 font-bold">扣完剩餘</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrder?.billOfMaterials
                      .filter(item => (item.usedQuantity || 0) > 0)
                      .map((item, index) => {
                        // 計算庫存扣除後的剩餘數量
                        const currentStock = item.currentStock || 0;
                        const usedQuantity = item.usedQuantity || 0;
                        const remainingStock = currentStock - usedQuantity;
                        
                        return (
                          <TableRow key={index}>
                                                          <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="font-mono">{item.code}</TableCell>
                              <TableCell className="font-medium text-blue-600">{formatStock(currentStock)} {item.unit}</TableCell>
                              <TableCell className="font-medium text-red-600">-{formatStock(usedQuantity)} {item.unit}</TableCell>
                              <TableCell className={`font-medium ${remainingStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatStock(remainingStock)} {item.unit}
                                {remainingStock < 0 && (
                                  <span className="ml-1 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                    庫存不足
                                  </span>
                                )}
                              </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
              
              {/* 表格顏色說明 */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>現有數量</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  <span>使用數量</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>剩餘數量</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  <span>庫存不足</span>
                </div>
              </div>
              
              {/* 庫存載入提示 */}
              {workOrder?.billOfMaterials.some(item => (item.currentStock || 0) === 0 && (item.usedQuantity || 0) > 0) && (
                <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-xs text-yellow-700">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    部分物料的庫存資訊可能未正確載入，請點擊「重新載入庫存」按鈕更新
                  </div>
                </div>
              )}
              
              {/* 庫存充足項目統計 */}
              {workOrder?.billOfMaterials.filter(item => {
                const currentStock = item.currentStock || 0;
                const usedQuantity = item.usedQuantity || 0;
                return (currentStock - usedQuantity) >= 0 && usedQuantity > 0;
              }).length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-sm text-green-700 font-medium">庫存充足項目</div>
                    <div className="text-lg font-bold text-green-600">
                      {workOrder?.billOfMaterials.filter(item => {
                        const currentStock = item.currentStock || 0;
                        const usedQuantity = item.usedQuantity || 0;
                        return (currentStock - usedQuantity) >= 0 && usedQuantity > 0;
                      }).length || 0} 項
                    </div>
                  </div>
                </div>
              )}
              
              {/* 庫存載入成功提示 */}
              {workOrder?.billOfMaterials.every(item => (item.currentStock || 0) > 0 || (item.usedQuantity || 0) === 0) && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700">
                    <Check className="h-3 w-3 inline mr-1" />
                    庫存資訊已正確載入
                  </div>
                </div>
              )}
              
              {/* 庫存扣除警告 */}
              <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 mb-1">庫存扣除提醒</p>
                    <p className="text-xs text-orange-700">
                      確認完工後，系統將實際扣除上述物料的使用數量，此操作無法復原。
                    </p>
                  </div>
                </div>
              </div>
              
              {workOrder?.billOfMaterials.filter(item => (item.usedQuantity || 0) > 0).length === 0 && (
                <div className="text-center py-4 text-red-500 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">警告：尚無填寫使用數量的物料</p>
                  <p className="text-sm">請先填寫至少一個物料的使用數量才能完工</p>
                </div>
              )}
              
              {/* 庫存不足警告 */}
              {workOrder?.billOfMaterials.some(item => {
                const currentStock = item.currentStock || 0;
                const usedQuantity = item.usedQuantity || 0;
                return (currentStock - usedQuantity) < 0;
              }) && (
                <div className="text-center py-4 text-orange-500 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">注意：有庫存不足的物料</p>
                  <p className="text-sm">部分物料的庫存不足以滿足使用數量，但仍可完工</p>
                  
                  {/* 庫存不足項目列表 */}
                  <div className="mt-3 text-left">
                    <p className="text-sm font-medium text-orange-700 mb-2">庫存不足項目：</p>
                    <div className="space-y-1">
                      {workOrder?.billOfMaterials
                        .filter(item => {
                          const currentStock = item.currentStock || 0;
                          const usedQuantity = item.usedQuantity || 0;
                          return (currentStock - usedQuantity) < 0;
                        })
                        .map((item, index) => {
                          const currentStock = item.currentStock || 0;
                          const usedQuantity = item.usedQuantity || 0;
                          const shortage = usedQuantity - currentStock;
                          return (
                            <div key={index} className="text-xs bg-orange-100 p-2 rounded border border-orange-200">
                              <div className="font-medium">{item.name} ({item.code})</div>
                              <div className="text-orange-600">
                                現有: {formatStock(currentStock)} {item.unit} | 
                                使用: {formatStock(usedQuantity)} {item.unit} | 
                                不足: {formatStock(shortage)} {item.unit}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 工時記錄 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">工時記錄</h3>
              {timeEntries && timeEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-gray-700 font-bold">人員</TableHead>
                        <TableHead className="text-gray-700 font-bold">工作日期</TableHead>
                        <TableHead className="text-gray-700 font-bold">開始時間</TableHead>
                        <TableHead className="text-gray-700 font-bold">結束時間</TableHead>
                        <TableHead className="text-gray-700 font-bold">工時小計</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{entry.personnelName}</TableCell>
                          <TableCell>{entry.startDate || entry.workDate}</TableCell>
                          <TableCell>{entry.startTime}</TableCell>
                          <TableCell>{entry.endTime}</TableCell>
                          <TableCell className="font-medium">
                            {parseFloat(entry.duration) || 0} 小時
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">總人工小時</div>
                      <div className="text-lg font-bold text-blue-600">
                        {totalHours} 小時 {totalMinutes} 分鐘
                      </div>
                      <div className="text-xs text-gray-500">共 {timeEntries.length} 筆紀錄</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-orange-500 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">注意：尚無工時記錄</p>
                  <p className="text-sm">建議先新增工時記錄再完工，但非必要</p>
                </div>
              )}
            </div>

            {/* 完工總結 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">完工總結</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-sm text-blue-600 mb-2">已填寫使用數量的物料</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {workOrder?.billOfMaterials.filter(item => (item.usedQuantity || 0) > 0).length || 0} 項
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 mb-2">總工時記錄</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {timeEntries?.length || 0} 筆
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 mb-2">總人工小時</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {totalHours} 小時 {totalMinutes} 分鐘
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 mb-2">目標產量</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {formatWeight(workOrder?.targetQuantity || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCompleteDialogOpen(false)} 
              className="w-full sm:w-auto"
              title="取消完工操作"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={isCompleting || (workOrder?.billOfMaterials.filter(item => (item.usedQuantity || 0) > 0).length === 0)}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              title={
                workOrder?.billOfMaterials.filter(item => (item.usedQuantity || 0) > 0).length === 0 
                  ? "請先填寫至少一個物料的使用數量" 
                  : workOrder?.billOfMaterials.some(item => {
                      const currentStock = item.currentStock || 0;
                      const usedQuantity = item.usedQuantity || 0;
                      return (currentStock - usedQuantity) < 0;
                    })
                    ? "有庫存不足的物料，但仍可完工並扣除庫存"
                    : "確認將工單狀態設為完工並扣除庫存"
              }
            >
                              {isCompleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    完工中...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {workOrder?.billOfMaterials.some(item => {
                      const currentStock = item.currentStock || 0;
                      const usedQuantity = item.usedQuantity || 0;
                      return (currentStock - usedQuantity) < 0;
                    }) ? "確認完工並扣除庫存 (有庫存不足)" : "確認完工並扣除庫存"}
                  </>
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 入庫確認對話框 */}
      <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-blue-600 text-lg sm:text-xl">確認入庫</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              即將將工單 &quot;{workOrder?.code}&quot; 設為入庫狀態。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 mb-1">重要提醒</p>
                  <p className="text-yellow-700 text-sm">
                    入庫後將無法再修改任何資料，包括：
                  </p>
                  <ul className="list-disc list-inside mt-1 text-sm text-yellow-700 space-y-1">
                    <li>目標產量和使用數量</li>
                    <li>工時申報記錄</li>
                    <li>工單狀態</li>
                  </ul>
                  <p className="text-yellow-700 text-sm mt-2">
                    僅可繼續新增留言和查看資料。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsWarehouseDialogOpen(false)} 
              className="w-full sm:w-auto"
              title="取消入庫操作"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmWarehouse}
              disabled={isWarehousing}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              title="確認將工單狀態設為入庫"
            >
              {isWarehousing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  入庫中...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  確認入庫
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除工單確認對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg sm:text-xl">確認刪除工單</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              此操作將永久刪除工單 &quot;{workOrder.code}&quot; 及其所有相關資料。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-3">將刪除以下內容：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>工單基本資料</li>
                <li>所有留言記錄</li>
                <li>所有上傳的圖片</li>
                <li>工時記錄</li>
              </ul>
              <p className="mt-3 font-medium text-red-600">
                此操作無法復原，請確認是否繼續？
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkOrder}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  刪除中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  確認刪除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
