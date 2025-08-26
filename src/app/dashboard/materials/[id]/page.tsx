'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, Warehouse, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MaterialDialog, MaterialData } from '../MaterialDialog';

interface Material {
  id: string;
  code: string;
  name: string;
  category?: string;
  subCategory?: string;
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
          <p className="text-muted-foreground font-mono">{material.code}</p>
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
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Warehouse className="h-4 w-4 text-white" />
            </div>
            物料基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 物料編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">物料編號</p>
                <p className="text-lg font-semibold text-blue-800">{material.code}</p>
              </div>
            </div>

            {/* 供應商 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">供應商</p>
                <p className="text-lg font-semibold text-green-800">{material.supplierName}</p>
              </div>
            </div>

            {/* 建立人員 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">建立人員</p>
                <p className="text-lg font-semibold text-purple-800">{material.createdByName}</p>
              </div>
            </div>

            {/* 建立時間 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">建立時間</p>
                <p className="text-lg font-semibold text-orange-800">
                  {material.createdAt.toLocaleDateString('zh-TW')}
                </p>
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
                <span className="text-muted-foreground">物料名稱</span>
                <span className="font-medium">{material.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">主分類</span>
                <span className="font-medium">{material.category || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">細分分類</span>
                <span className="font-medium">{material.subCategory || '未分類'}</span>
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
                  ${material.costPerUnit?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">庫存價值</span>
                <span className="font-medium text-purple-600">
                  ${((material.currentStock || 0) * (material.costPerUnit || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 備註 */}
      {material.notes && (
        <Card className="mt-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">備註</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{material.notes}</p>
          </CardContent>
        </Card>
      )}

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
