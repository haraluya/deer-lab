"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, Timestamp, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { uploadImage, uploadMultipleImages } from "@/lib/imageUpload"
import { 
  ArrowLeft, Edit, Save, CheckCircle, AlertCircle, Clock, Package, Users, 
  Droplets, Calculator, MessageSquare, Calendar, User, Plus, X, Loader2, Upload, Trash2,
  RefreshCw, Check
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
  }>
  targetQuantity: number
  actualQuantity: number
  status: string
  qcStatus: string
  createdAt: any
  createdByRef: any
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

interface Personnel {
  id: string
  name: string
  employeeId: string
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

  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null)
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddTimeRecordOpen, setIsAddTimeRecordOpen] = useState(false)
  const [editData, setEditData] = useState({
    status: "",
    qcStatus: "",
    actualQuantity: 0,
    targetQuantity: 0,
    notes: ""
  })
  const [newTimeRecord, setNewTimeRecord] = useState({
    personnelId: "",
    workDate: "",
    startTime: "",
    endTime: ""
  })
  
  // 留言相關狀態
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [isEditingQuantity, setIsEditingQuantity] = useState(false)

  // 載入工單資料
  const fetchWorkOrder = useCallback(async () => {
    if (!workOrderId || !db) return;
    
    setLoading(true);
    try {
      const workOrderDoc = await getDoc(doc(db, 'workOrders', workOrderId));
      if (workOrderDoc.exists()) {
        const data = workOrderDoc.data();
        console.log('工單資料:', data); // 調試日誌
        console.log('產品快照:', data.productSnapshot); // 調試日誌
        
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
          billOfMaterials: (data.billOfMaterials || []).map((item: any) => {
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
              usedQuantity: item.usedQuantity || item.quantity || item.requiredQuantity || 0
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
  }, [workOrderId, db, router]);

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
        }))
        .filter((person: any) => person.status === 'active') // 只顯示啟用狀態的人員
        .map((person: any) => ({
          id: person.id,
          name: person.name,
          employeeId: person.employeeId,
        })) as Personnel[]
      
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
      // 優先使用工單中的產品快照資料，確保香精資料的完整性
      const productSnapshotData = workOrder.productSnapshot;
      console.log('重新載入BOM表 - 工單中的產品快照:', productSnapshotData);
      
      // 嘗試從香精集合中獲取完整的香精配方資料
      let fragranceFormulaData = null;
      if (productSnapshotData.fragranceCode && productSnapshotData.fragranceCode !== '未指定') {
        const fragranceQuery = query(
          collection(db, "fragrances"),
          where("code", "==", productSnapshotData.fragranceCode)
        );
        const fragranceSnapshot = await getDocs(fragranceQuery);
        
        if (!fragranceSnapshot.empty) {
          fragranceFormulaData = fragranceSnapshot.docs[0].data();
          console.log('重新載入BOM表 - 從香精集合獲取的配方資料:', fragranceFormulaData);
        } else {
          console.log('重新載入BOM表 - 在香精集合中找不到對應的香精:', productSnapshotData.fragranceCode);
        }
      }
      
      // 構建完整的產品資料，優先使用工單快照
      const productData = {
        name: productSnapshotData.name,
        fragranceName: productSnapshotData.fragranceName,
        fragranceCode: productSnapshotData.fragranceCode,
        nicotineMg: productSnapshotData.nicotineMg,
        fragranceFormula: fragranceFormulaData?.fragranceFormula || null
      };
      
      console.log('重新載入BOM表 - 最終使用的產品資料:', productData);
      
      // 重新計算BOM表（使用與建立工單相同的邏輯）
      const materialRequirements = await calculateMaterialRequirements(
        productData,
        workOrder.targetQuantity
      );
      
      // 更新工單的BOM表
      const docRef = doc(db, "workOrders", workOrderId);
      await updateDoc(docRef, {
        billOfMaterials: materialRequirements,
        updatedAt: Timestamp.now()
      });
      
      // 重新載入工單資料
      await fetchWorkOrder();
      
      toast.success("BOM表已重新載入");
    } catch (error) {
      console.error("重新載入BOM表失敗:", error);
      toast.error("重新載入BOM表失敗");
    } finally {
      setIsReloading(false);
    }
  }, [workOrder, db, workOrderId, fetchWorkOrder]);

  // 計算物料需求的輔助函數 - 完全重新計算，如同建立工單時一樣
  const calculateMaterialRequirements = async (productData: any, targetQuantity: number) => {
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
    
    // 合併物料和香精資料
    const allMaterials = [...materialsList, ...fragrancesList];
    console.log('重新載入BOM表 - 載入的物料列表:', materialsList.length, '個');
    console.log('重新載入BOM表 - 載入的香精列表:', fragrancesList.length, '個');
    console.log('重新載入BOM表 - 合併後的總物料列表:', allMaterials.length, '個');
    
    const materialRequirementsMap = new Map<string, any>();
    
    // 1. 直接使用香精詳情中的配方比例（避免浮點數精度問題）
    let fragranceRatios = { fragrance: 35.7, pg: 24.3, vg: 40 }; // 預設比例
    console.log('重新載入BOM表 - 檢查香精配方資料:', productData.fragranceFormula);
    
    if (productData.fragranceFormula) {
      const { percentage, pgRatio, vgRatio } = productData.fragranceFormula;
      console.log('重新載入BOM表 - 香精配方資料:', { percentage, pgRatio, vgRatio });
      
      if (percentage > 0) {
        // 直接使用香精詳情中的原始比例，避免浮點數精度問題
        fragranceRatios = {
          fragrance: percentage, // 直接使用香精詳情中的percentage（如35.7）
          pg: pgRatio,          // 直接使用香精詳情中的pgRatio（如24.3）
          vg: vgRatio           // 直接使用香精詳情中的vgRatio（如40）
        };
        
        console.log('重新載入BOM表 - 直接使用香精詳情中的配方比例（避免浮點數精度問題）:', {
          香精: percentage + '%',
          PG: pgRatio + '%',
          VG: vgRatio + '%',
          總計: (percentage + pgRatio + vgRatio) + '%'
        });
      } else {
        console.log('重新載入BOM表 - 香精比例為0，使用預設比例');
      }
    } else {
      console.log('重新載入BOM表 - 沒有香精配方資料，使用預設比例');
    }
    console.log('重新載入BOM表 - 最終使用香精比例:', fragranceRatios);
    
    // 2. 核心液體 (香精、PG、VG、尼古丁) - 總是添加所有核心液體
    // 香精 - 總是添加，並檢查實際庫存
    if (productData.fragranceName && productData.fragranceName !== '未指定') {
      const fragranceQuantity = targetQuantity * (fragranceRatios.fragrance / 100); // 35.7% = 0.357
      
      // 查找香精的實際庫存 - 更寬鬆的匹配條件
      const fragranceMaterial = allMaterials.find((m: any) => 
        m.code === productData.fragranceCode || 
        m.name === productData.fragranceName ||
        m.name?.includes(productData.fragranceName) ||
        (productData.fragranceCode && m.code?.includes(productData.fragranceCode)) ||
        m.name?.includes('皇家康普茶') || // 額外的匹配條件
        m.code?.includes('HYP') // 額外的匹配條件
      );
      
      console.log('重新載入BOM表 - 香精匹配結果:', {
        fragranceCode: productData.fragranceCode,
        fragranceName: productData.fragranceName,
        foundMaterial: fragranceMaterial ? {
          id: fragranceMaterial.id,
          code: fragranceMaterial.code,
          name: fragranceMaterial.name
        } : null,
        allMaterials: allMaterials.map((m: any) => ({ code: m.code, name: m.name }))
      });
      
      const currentStock = fragranceMaterial ? (fragranceMaterial.currentStock || 0) : 0;
      const hasEnoughStock = currentStock >= fragranceQuantity;
      
      // 總是添加香精，即使沒有找到對應的物料記錄
      materialRequirementsMap.set('fragrance', {
        id: fragranceMaterial ? fragranceMaterial.id : productData.fragranceCode || 'fragrance',
        name: productData.fragranceName,
        code: productData.fragranceCode,
        type: 'fragrance',
        quantity: fragranceQuantity,
        unit: 'KG',
        ratio: fragranceRatios.fragrance, // 直接儲存香精詳情中的原始百分比值
        isCalculated: true,
        category: 'fragrance',
        usedQuantity: fragranceQuantity
      });
      console.log('重新載入BOM表 - 添加香精:', productData.fragranceName, fragranceQuantity, '比例:', fragranceRatios.fragrance, '庫存:', currentStock, '充足:', hasEnoughStock);
    } else {
      console.log('重新載入BOM表 - 香精名稱未指定或為空，跳過香精添加');
    }
    
    // PG (丙二醇) - 總是添加，使用配方比例
    const pgMaterial = allMaterials.find((m: any) => m.name?.includes('PG丙二醇') || m.name?.includes('PG') || m.code?.includes('PG'));
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
        usedQuantity: pgQuantity
      });
      console.log('重新載入BOM表 - 添加PG:', pgMaterial.name, pgQuantity, '比例:', fragranceRatios.pg);
    }
    
    // VG (甘油) - 總是添加，使用配方比例
    const vgMaterial = allMaterials.find((m: any) => m.name?.includes('VG甘油') || m.name?.includes('VG') || m.code?.includes('VG'));
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
        usedQuantity: vgQuantity
      });
      console.log('重新載入BOM表 - 添加VG:', vgMaterial.name, vgQuantity, '比例:', fragranceRatios.vg);
    }
    
    // 尼古丁 - 總是添加，使用產品濃度計算
    const nicotineMaterial = allMaterials.find((m: any) => m.name?.includes('丁鹽') || m.name?.includes('尼古丁') || m.code?.includes('NIC'));
    if (nicotineMaterial) {
      const nicotineQuantity = productData.nicotineMg && productData.nicotineMg > 0 
        ? (targetQuantity * productData.nicotineMg) / 250 
        : 0;
      materialRequirementsMap.set(nicotineMaterial.id, {
        id: nicotineMaterial.id,
        name: nicotineMaterial.name,
        code: nicotineMaterial.code,
        type: 'material',
        quantity: nicotineQuantity,
        unit: nicotineMaterial.unit || 'KG',
        ratio: productData.nicotineMg ? productData.nicotineMg / 250 : 0,
        isCalculated: true,
        category: 'nicotine',
        usedQuantity: nicotineQuantity
      });
      console.log('重新載入BOM表 - 添加尼古丁:', nicotineMaterial.name, nicotineQuantity, '濃度:', productData.nicotineMg);
    }
    
    // 3. 其他材料（專屬材料和通用材料）- 根據實際需求計算
          // 專屬材料 - 保持原有的專屬材料，但不配置需求量
      console.log('重新載入BOM表 - 專屬材料名稱:', workOrder?.billOfMaterials?.filter(item => item.category === 'specific').map(item => item.name));
      const existingSpecificMaterials = workOrder?.billOfMaterials?.filter(item => item.category === 'specific') || [];
      existingSpecificMaterials.forEach(item => {
        materialRequirementsMap.set(item.id, {
          ...item,
          quantity: 0, // 專屬材料不配置需求量
          usedQuantity: item.usedQuantity || 0
        });
        console.log('重新載入BOM表 - 保持專屬材料:', item.name, '需求量: 0', item.unit);
      });
      
      // 通用材料 - 保持原有的通用材料，但不配置需求量
      console.log('重新載入BOM表 - 通用材料名稱:', workOrder?.billOfMaterials?.filter(item => item.category === 'common').map(item => item.name));
      const existingCommonMaterials = workOrder?.billOfMaterials?.filter(item => item.category === 'common') || [];
      existingCommonMaterials.forEach(item => {
        materialRequirementsMap.set(item.id, {
          ...item,
          quantity: 0, // 通用材料不配置需求量
          usedQuantity: item.usedQuantity || 0
        });
        console.log('重新載入BOM表 - 保持通用材料:', item.name, '需求量: 0', item.unit);
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
        createdBy: "當前用戶" // 這裡應該使用實際的用戶名稱
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
  }, [fetchWorkOrder, fetchPersonnel])

  // 初始化新增工時紀錄表單
  useEffect(() => {
    if (isAddTimeRecordOpen) {
      const today = new Date().toISOString().split('T')[0]
      setNewTimeRecord({
        personnelId: "",
        workDate: today, // 預設今天
        startTime: "",
        endTime: ""
      })
    }
  }, [isAddTimeRecordOpen])

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
      const docRef = doc(db, "workOrders", workOrderId)
      await updateDoc(docRef, {
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        targetQuantity: editData.targetQuantity,
        notes: editData.notes,
        updatedAt: Timestamp.now()
      })

      setWorkOrder(prev => prev ? {
        ...prev,
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        targetQuantity: editData.targetQuantity,
        notes: editData.notes
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

  // 新增工時紀錄
  const handleAddTimeRecord = async () => {
    if (!newTimeRecord.personnelId || !newTimeRecord.workDate || !newTimeRecord.startTime || !newTimeRecord.endTime) {
      toast.error("請填寫完整的工時資訊")
      return
    }

    if (!db) {
      toast.error("資料庫連線錯誤")
      return
    }

    try {
      // 驗證時間格式
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(newTimeRecord.startTime) || !timeRegex.test(newTimeRecord.endTime)) {
        toast.error("請輸入正確的時間格式 (HH:MM)")
        return
      }

      // 計算工時
      const startDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.startTime}`)
      const endDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.endTime}`)
      
      if (endDateTime <= startDateTime) {
        toast.error("結束時間必須晚於開始時間")
        return
      }

      const diffMs = endDateTime.getTime() - startDateTime.getTime()
      const totalMinutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      const selectedPersonnel = personnel.find(p => p.id === newTimeRecord.personnelId)
      if (!selectedPersonnel) {
        toast.error("找不到指定人員")
        return
      }

      const timeRecord = {
        personnelId: newTimeRecord.personnelId,
        personnelName: selectedPersonnel.name,
        workDate: newTimeRecord.workDate,
        startTime: newTimeRecord.startTime,
        endTime: newTimeRecord.endTime,
        hours,
        minutes,
        totalMinutes,
        createdAt: Timestamp.now()
      }

      // 儲存到資料庫
      await addDoc(collection(db, 'workOrderTimeRecords'), {
        workOrderId: workOrderId,
        ...timeRecord
      })

      // 更新本地狀態
      setWorkOrder(prev => prev ? {
        ...prev,
        timeRecords: [...(prev.timeRecords || []), { id: Date.now().toString(), ...timeRecord }]
      } : null)

      // 重置表單
      setNewTimeRecord({
        personnelId: "",
        workDate: new Date().toISOString().split('T')[0], // 重置為今天
        startTime: "",
        endTime: ""
      })
      setIsAddTimeRecordOpen(false)
      toast.success("工時紀錄已新增")
    } catch (error) {
      console.error("新增工時紀錄失敗:", error)
      toast.error("新增工時紀錄失敗")
    }
  }

  // 計算總人工小時
  const totalWorkHours = workOrder?.timeRecords?.reduce((total, record) => {
    return total + record.totalMinutes
  }, 0) || 0

  const totalHours = Math.floor(totalWorkHours / 60)
  const totalMinutes = totalWorkHours % 60

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">載入工單資料中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-red-600 mb-4">工單不存在</p>
          <Button onClick={() => router.push("/dashboard/work-orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工單列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto p-2 sm:p-4 py-4 sm:py-10">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => router.back()}
              className="hover:bg-white/80 backdrop-blur-sm"
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
          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="bg-red-500 hover:bg-red-600 flex-shrink-0"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            刪除工單
          </Button>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm text-gray-600">目前工單狀態</Label>
              {isEditing ? (
                <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
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
                  onChange={(e) => setEditData(prev => ({ ...prev, targetQuantity: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 font-medium text-gray-900">{workOrder.targetQuantity} KG</div>
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
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
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
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReloadBOM}
                disabled={isReloading}
                className="text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                {isReloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                重新載入
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingQuantity(!isEditingQuantity)}
                className="text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                {isEditingQuantity ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    完成編輯
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-1" />
                    編輯數量
                  </>
                )}
              </Button>
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
              <div className="overflow-x-auto">
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
                          <TableCell className="font-medium">{item.quantity.toFixed(3)}</TableCell>
                          <TableCell>
                            {isEditingQuantity ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={item.usedQuantity || 0}
                                onChange={(e) => {
                                  // 這裡可以添加更新使用數量的邏輯
                                  console.log('更新使用數量:', item.id, e.target.value);
                                }}
                                className="w-20"
                              />
                            ) : (
                              <span className="font-medium">{(item.usedQuantity || 0).toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 產品專屬物料 */}
            {workOrder.billOfMaterials.filter(item => item.category === 'specific').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  產品專屬物料
                </h3>
                <div className="overflow-x-auto">
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
                                  value={item.usedQuantity || 0}
                                  onChange={(e) => {
                                    console.log('更新使用數量:', item.id, e.target.value);
                                  }}
                                  className="w-20"
                                />
                              ) : (
                                <span className="font-medium">{item.usedQuantity || 0}</span>
                              )}
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-green-600 to-emerald-700">
                        <TableHead className="text-white font-bold">物料名稱</TableHead>
                        <TableHead className="text-white font-bold">料件代號</TableHead>
                        <TableHead className="text-white font-bold">使用數量</TableHead>
                        <TableHead className="text-white font-bold">單位</TableHead>
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
                                  value={item.usedQuantity || 0}
                                  onChange={(e) => {
                                    console.log('更新使用數量:', item.id, e.target.value);
                                  }}
                                  className="w-20"
                                />
                              ) : (
                                <span className="font-medium">{item.usedQuantity || 0}</span>
                              )}
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 工時申報 */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-orange-800 flex items-center gap-2 text-lg sm:text-xl">
              <Clock className="h-5 w-5" />
              工時申報
            </CardTitle>
            <Button
              onClick={() => setIsAddTimeRecordOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增工時紀錄
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 總人工小時統計 */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-lg border">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">總人工小時</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {totalHours} 小時 {totalMinutes} 分鐘
              </div>
              <div className="text-xs text-gray-500">共 {workOrder.timeRecords?.length || 0} 筆紀錄</div>
            </div>
          </div>

          {/* 工時紀錄列表 */}
          {workOrder.timeRecords && workOrder.timeRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-600 to-amber-700">
                    <TableHead className="text-white font-bold text-xs sm:text-sm">人員</TableHead>
                    <TableHead className="text-white font-bold text-xs sm:text-sm">工作日期</TableHead>
                    <TableHead className="text-white font-bold text-xs sm:text-sm">開始時間</TableHead>
                    <TableHead className="text-white font-bold text-xs sm:text-sm">結束時間</TableHead>
                    <TableHead className="text-white font-bold text-xs sm:text-sm">工時小計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrder.timeRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.personnelName}</TableCell>
                      <TableCell>{record.workDate}</TableCell>
                      <TableCell>{record.startTime}</TableCell>
                      <TableCell>{record.endTime}</TableCell>
                      <TableCell className="font-medium">
                        {record.hours} 小時 {record.minutes} 分鐘
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>尚無工時紀錄</p>
              <p className="text-sm">點擊上方按鈕新增工時紀錄</p>
            </div>
          )}
        </CardContent>
      </Card>



      {/* 新增工時紀錄對話框 */}
      <Dialog open={isAddTimeRecordOpen} onOpenChange={setIsAddTimeRecordOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">新增工時紀錄</DialogTitle>
            <DialogDescription>
              請填寫工時紀錄的詳細資訊
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="personnel">選擇人員</Label>
              <Select value={newTimeRecord.personnelId} onValueChange={(value) => setNewTimeRecord(prev => ({ ...prev, personnelId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="請選擇人員" />
                </SelectTrigger>
                <SelectContent>
                  {personnel.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="workDate">工作日期</Label>
              <Input
                id="workDate"
                type="date"
                value={newTimeRecord.workDate}
                onChange={(e) => setNewTimeRecord(prev => ({ ...prev, workDate: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">開始時間 (24小時制)</Label>
                <div className="flex gap-2 mt-1">
                  <Select 
                    value={newTimeRecord.startTime.split(':')[0] || ''} 
                    onValueChange={(hour) => {
                      const currentMinute = newTimeRecord.startTime.split(':')[1] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        startTime: `${hour.padStart(2, '0')}:${currentMinute}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center text-gray-500">:</span>
                  <Select 
                    value={newTimeRecord.startTime.split(':')[1] || ''} 
                    onValueChange={(minute) => {
                      const currentHour = newTimeRecord.startTime.split(':')[0] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        startTime: `${currentHour}:${minute.padStart(2, '0')}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500 mt-1">格式：HH:MM (例如：09:30, 14:00)</p>
              </div>
              <div>
                <Label htmlFor="endTime">結束時間 (24小時制)</Label>
                <div className="flex gap-2 mt-1">
                  <Select 
                    value={newTimeRecord.endTime.split(':')[0] || ''} 
                    onValueChange={(hour) => {
                      const currentMinute = newTimeRecord.endTime.split(':')[1] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        endTime: `${hour.padStart(2, '0')}:${currentMinute}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center text-gray-500">:</span>
                  <Select 
                    value={newTimeRecord.endTime.split(':')[1] || ''} 
                    onValueChange={(minute) => {
                      const currentHour = newTimeRecord.endTime.split(':')[0] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        endTime: `${currentHour}:${minute.padStart(2, '0')}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500 mt-1">格式：HH:MM (例如：17:30, 18:00)</p>
              </div>
            </div>

            {/* 預覽工時計算 */}
            {newTimeRecord.startTime && newTimeRecord.endTime && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">工時預覽：</div>
                  <div>開始：{newTimeRecord.startTime}</div>
                  <div>結束：{newTimeRecord.endTime}</div>
                  {(() => {
                    try {
                      const startDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.startTime}`)
                      const endDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.endTime}`)
                      if (endDateTime > startDateTime) {
                        const diffMs = endDateTime.getTime() - startDateTime.getTime()
                        const totalMinutes = Math.floor(diffMs / (1000 * 60))
                        const hours = Math.floor(totalMinutes / 60)
                        const minutes = totalMinutes % 60
                        return (
                          <div className="font-semibold text-green-700 mt-1">
                            工時：{hours} 小時 {minutes} 分鐘
                          </div>
                        )
                      } else {
                        return <div className="text-red-600 mt-1">⚠️ 結束時間必須晚於開始時間</div>
                      }
                    } catch (error) {
                      return <div className="text-red-600 mt-1">⚠️ 時間格式錯誤</div>
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAddTimeRecordOpen(false)} className="w-full sm:w-auto">
              取消
            </Button>
            <Button 
              onClick={handleAddTimeRecord} 
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
              disabled={!newTimeRecord.personnelId || !newTimeRecord.workDate || !newTimeRecord.startTime || !newTimeRecord.endTime}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增紀錄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 留言功能 */}
      <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            留言記錄
            <Badge variant="secondary" className="ml-2">
              {comments.length} 則留言
            </Badge>
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
                        <img
                          src={imageUrl}
                          alt={`圖片 ${index + 1}`}
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
                          <img
                            src={imageUrl}
                            alt={`留言圖片 ${index + 1}`}
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

      {/* 刪除工單確認對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg sm:text-xl">確認刪除工單</DialogTitle>
            <div className="text-sm text-gray-600">
              此操作將永久刪除工單 "{workOrder.code}" 及其所有相關資料，包括：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>工單基本資料</li>
                <li>所有留言記錄</li>
                <li>所有上傳的圖片</li>
                <li>工時記錄</li>
              </ul>
              <p className="mt-3 font-medium text-red-600">
                此操作無法復原，請確認是否繼續？
              </p>
            </div>
          </DialogHeader>
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
