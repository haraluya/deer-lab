'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, Warehouse, Edit, AlertTriangle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MaterialDialog, MaterialData } from '../MaterialDialog';
import { toast } from 'sonner';

interface Material {
  id: string;
  code: string;
  name: string;
  category?: string;
  subCategory?: string;
  mainCategoryId?: string; // 新增：主分類ID
  subCategoryId?: string;  // 新增：細分分類ID
  supplierRef?: any;
  supplierName?: string;
  safetyStockLevel?: number;
  costPerUnit?: number;
  unit?: string;
  currentStock: number;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [material, setMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // 解析並顯示代碼結構
  const renderCodeStructure = (code: string) => {
    if (code.length !== 9) {
      return (
        <div className="text-sm text-muted-foreground">
          <div>舊格式代碼</div>
          <div className="font-mono">{code}</div>
        </div>
      );
    }
    
    const mainCategoryId = code.substring(0, 2);
    const subCategoryId = code.substring(2, 5);
    const randomCode = code.substring(5, 9);
    
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">代碼結構</div>
        <div className="flex items-center gap-1 text-sm font-mono">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{mainCategoryId}</span>
          <span className="text-muted-foreground">+</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{subCategoryId}</span>
          <span className="text-muted-foreground">+</span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">{randomCode}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          主分類ID + 細分分類ID + 隨機碼
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!params.id || typeof params.id !== 'string') {
        setError('物料 ID 無效');
        setIsLoading(false);
        return;
      }

      try {
        if (!db) {
          throw new Error('Firebase 未初始化');
        }
        const materialDoc = await getDoc(doc(db, 'materials', params.id));
        if (!materialDoc.exists()) {
          setError('物料不存在');
          setIsLoading(false);
          return;
        }

        const data = materialDoc.data();

        // 獲取供應商名稱
        let supplierName = '未指定';
        if (data.supplierRef) {
          try {
            const supplierDoc = await getDoc(data.supplierRef);
            if (supplierDoc.exists()) {
              const supplierData = supplierDoc.data() as any;
              supplierName = supplierData?.name || '未指定';
            }
          } catch (error) {
            console.error('Failed to fetch supplier name:', error);
          }
        }

        // 獲取創建者名稱
        let createdByName = '未知';
        if (data.createdBy) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.createdBy));
            if (userDoc.exists()) {
              const userData = userDoc.data() as any;
              createdByName = userData?.name || userData?.email || '未知';
            }
          } catch (error) {
            console.error('Failed to fetch creator name:', error);
          }
        }

        setMaterial({
          id: materialDoc.id,
          code: data.code,
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          mainCategoryId: data.mainCategoryId,
          subCategoryId: data.subCategoryId,
          supplierRef: data.supplierRef,
          supplierName,
          safetyStockLevel: data.safetyStockLevel || 0,
          costPerUnit: data.costPerUnit || 0,
          unit: data.unit,
          currentStock: data.currentStock || 0,
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
        });
      } catch (error) {
        console.error('Failed to fetch material:', error);
        setError('讀取物料資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterial();
  }, [params.id]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleMaterialUpdate = async () => {
    // 重新載入物料資料
    window.location.reload();
  };

  // 格式化數字顯示，如果沒有小數點就不顯示
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0';
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  // 開始編輯備註
  const handleStartEditNotes = () => {
    setNotesValue(material?.notes || '');
    setIsEditingNotes(true);
  };

  // 取消編輯備註
  const handleCancelEditNotes = () => {
    setNotesValue(material?.notes || '');
    setIsEditingNotes(false);
  };

  // 儲存備註
  const handleSaveNotes = async () => {
    if (!material || !db) return;

    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'materials', material.id), {
        notes: notesValue
      });
      
      setMaterial(prev => prev ? { ...prev, notes: notesValue } : null);
      setIsEditingNotes(false);
      toast.success('備註已更新');
    } catch (error) {
      console.error('更新備註失敗:', error);
      toast.error('更新備註失敗');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // 檢查是否低於安全庫存
  const isLowStock = () => {
    return material ? (material.currentStock || 0) < (material.safetyStockLevel || 0) : false;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-border rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '物料不存在'}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題區域 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()}
          className="hover:bg-primary/10 hover:border-primary/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
                 <div className="flex-grow">
           <h1 className="text-3xl font-bold text-primary">
             物料詳情
           </h1>
                       <div className="flex items-center gap-2">
              <p className="text-muted-foreground font-mono text-lg">{material.name}</p>
            </div>
         </div>
        <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="mr-2 h-4 w-4" />
          編輯物料
        </Button>
      </div>

      {/* 物料基本資訊卡片 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            物料基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {/* 第1個欄位：物料名稱 + 物料代碼 */}
             <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
               <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                 <Package className="h-5 w-5 text-white" />
               </div>
               <div className="flex-1">
                 <p className="text-sm text-blue-600 font-medium">物料名稱</p>
                 <p className="text-xl font-bold text-blue-800">{material.name}</p>
                 <p className="text-xs text-blue-600 mt-1">代碼：{material.code}</p>
               </div>
             </div>

             {/* 第2個欄位：主分類 + 細分分類 */}
             <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
               <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                 <Warehouse className="h-5 w-5 text-white" />
               </div>
                               <div className="flex-1">
                  <p className="text-sm text-green-600 font-medium">分類資訊</p>
                  <p className="text-xl font-bold text-green-800">{material.category || '未分類'}</p>
                  <p className="text-sm text-green-700">{material.subCategory || '未分類'}</p>
                </div>
             </div>

             {/* 第3個欄位：現有庫存 + 單位 */}
             <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
               <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                 <Tag className="h-5 w-5 text-white" />
               </div>
               <div className="flex-1">
                 <p className="text-sm text-purple-600 font-medium">現有庫存</p>
                 <p className="text-xl font-bold text-purple-800">{material.currentStock}</p>
                 <p className="text-sm text-purple-700">{material.unit || '未指定'}</p>
               </div>
             </div>

             {/* 第4個欄位：供應商 */}
             <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
               <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                 <Building className="h-5 w-5 text-white" />
               </div>
               <div className="flex-1">
                 <p className="text-sm text-orange-600 font-medium">供應商</p>
                 <p className="text-xl font-bold text-orange-800">{material.supplierName}</p>
               </div>
             </div>
           </div>
        </CardContent>
      </Card>

      {/* 物料詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">供應商</span>
                <span className="font-medium">{material.supplierName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">建立人員</span>
                <span className="font-medium">{material.createdByName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">建立時間</span>
                <span className="font-medium">{material.createdAt.toLocaleDateString('zh-TW')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">單位</span>
                <span className="font-medium">{material.unit || '未指定'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 庫存資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">庫存資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">目前庫存</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isLowStock() ? "text-red-600" : ""}`}>
                    {material.currentStock} {material.unit}
                  </span>
                  {isLowStock() && (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">安全庫存</span>
                <span className="font-medium text-green-600">
                  {material.safetyStockLevel} {material.unit}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">單位成本</span>
                <span className="font-medium text-blue-600">
                  ${formatNumber(material.costPerUnit)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">庫存價值</span>
                <span className="font-medium text-purple-600">
                  ${formatNumber((material.currentStock || 0) * (material.costPerUnit || 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 備註 */}
      <Card className="mt-6 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-primary">備註</CardTitle>
            {!isEditingNotes && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditNotes}
                className="h-8 px-3"
              >
                <Edit className="mr-1 h-3 w-3" />
                編輯
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="輸入備註內容..."
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditNotes}
                  disabled={isSavingNotes}
                >
                  <X className="mr-1 h-3 w-3" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
                  <Save className="mr-1 h-3 w-3" />
                  {isSavingNotes ? '儲存中...' : '儲存'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {material.notes || '暫無備註'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 庫存警告 */}
      {isLowStock() && (
        <Card className="mt-6 border-0 shadow-lg bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              庫存警告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              目前庫存 ({material.currentStock} {material.unit}) 低於安全庫存 ({material.safetyStockLevel} {material.unit})，
              建議及時補充庫存。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 編輯物料對話框 */}
      {material && (
        <MaterialDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          materialData={material as MaterialData}
          onMaterialUpdate={handleMaterialUpdate}
        />
      )}
    </div>
  );
}
