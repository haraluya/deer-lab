'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, Droplets, Edit, FlaskConical, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FragranceDialog, FragranceData } from '../FragranceDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';

interface Fragrance {
  id: string;
  code: string;
  name: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierRef?: any;
  supplierName?: string;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  description?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  productCount: number;
  remarks?: string; // 新增備註欄位
}

interface Product {
  id: string;
  code: string;
  name: string;
  status: string;
  seriesName?: string;
  createdAt: Date;
}

export default function FragranceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditRemarksOpen, setIsEditRemarksOpen] = useState(false); // 新增備註編輯對話框狀態
  const [isSupplierDetailOpen, setIsSupplierDetailOpen] = useState(false);
  const [supplierData, setSupplierData] = useState<any>(null);

  // 計算正確的香精配方比例
  const calculateCorrectRatios = (percentage: number, pgRatio: number, vgRatio: number) => {
    if (percentage <= 0) {
      return { fragrance: 0, pg: 0, vg: 0, total: 0 };
    }

    const fragranceRatio = percentage / 100;
    
    // PG比例：如果香精低於60%，PG補滿60%，否則不加PG
    let pgRatioCalculated = 0;
    if (fragranceRatio < 0.6) {
      pgRatioCalculated = 0.6 - fragranceRatio;
    }
    
    // VG比例：剩餘部分
    const vgRatioCalculated = 1 - fragranceRatio - pgRatioCalculated;
    
    return {
      fragrance: percentage,
      pg: Math.round(pgRatioCalculated * 100 * 10) / 10,
      vg: Math.round(vgRatioCalculated * 100 * 10) / 10,
      total: Math.round((fragranceRatio + pgRatioCalculated + vgRatioCalculated) * 100 * 10) / 10
    };
  };

  useEffect(() => {
    const fetchFragrance = async () => {
      if (!params.id || typeof params.id !== 'string') {
        setError('香精 ID 無效');
        setIsLoading(false);
        return;
      }

      try {
        if (!db) {
          throw new Error('Firebase 未初始化');
        }
        const fragranceDoc = await getDoc(doc(db, 'fragrances', params.id));
        if (!fragranceDoc.exists()) {
          setError('香精不存在');
          setIsLoading(false);
          return;
        }

        const data = fragranceDoc.data();

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

        // 獲取使用該香精的產品數量
        const productsQuery = query(
          collection(db, 'products'),
          where('currentFragranceRef', '==', doc(db, 'fragrances', params.id))
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            code: data.code,
            name: data.name,
            status: data.status || '啟用', // 確保狀態有預設值
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        });

        setProducts(productsList);

        setFragrance({
          id: fragranceDoc.id,
          code: data.code,
          name: data.name,
          fragranceType: data.fragranceType || data.status,
          fragranceStatus: data.fragranceStatus || data.status || 'active',
          supplierRef: data.supplierRef,
          supplierName,
          costPerUnit: data.costPerUnit,
          percentage: data.percentage,
          pgRatio: data.pgRatio,
          vgRatio: data.vgRatio,
          description: data.description,
          notes: data.notes,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
          productCount: productsList.length,
          remarks: data.remarks, // 獲取備註
        });
      } catch (error) {
        console.error('Failed to fetch fragrance:', error);
        setError('讀取香精資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFragrance();
  }, [params.id]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleSupplierClick = async () => {
    if (!fragrance?.supplierRef) return;
    
    try {
      const supplierDoc = await getDoc(fragrance.supplierRef);
      if (supplierDoc.exists()) {
        const data = supplierDoc.data() as any;
        
        // 獲取對接人員資訊
        let liaisonPersonName = '未指定';
        if (data.liaisonPersonId && db) {
          try {
            const liaisonDoc = await getDoc(doc(db, 'users', data.liaisonPersonId));
            if (liaisonDoc.exists()) {
              const liaisonData = liaisonDoc.data();
              liaisonPersonName = liaisonData.name || '未指定';
            }
          } catch (error) {
            console.error('獲取對接人員資訊失敗:', error);
          }
        }
        
        setSupplierData({
          id: supplierDoc.id,
          name: data.name || '未指定',
          products: data.products || '未指定',
          contactWindow: data.contactWindow || '未指定',
          contactMethod: data.contactMethod || '未指定',
          liaisonPersonName,
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
        setIsSupplierDetailOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch supplier data:', error);
    }
  };

  const handleFragranceUpdate = async () => {
    // 重新獲取香精資料而不是重新載入頁面
    setIsLoading(true);
    try {
      if (!params.id || typeof params.id !== 'string') {
        setError('香精 ID 無效');
        return;
      }

      if (!db) {
        throw new Error('Firebase 未初始化');
      }
      
      const fragranceDoc = await getDoc(doc(db, 'fragrances', params.id));
      if (!fragranceDoc.exists()) {
        setError('香精不存在');
        return;
      }

      const data = fragranceDoc.data();

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

      // 獲取使用該香精的產品數量
      const productsQuery = query(
        collection(db, 'products'),
        where('currentFragranceRef', '==', doc(db, 'fragrances', params.id))
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsList = await Promise.all(productsSnapshot.docs.map(async doc => {
        const data = doc.data();
        
        // 獲取系列名稱
        let seriesName = '未指定';
        if (data.seriesRef) {
          try {
            const seriesDoc = await getDoc(data.seriesRef);
            if (seriesDoc.exists()) {
              const seriesData = seriesDoc.data() as any;
              seriesName = seriesData?.name || '未指定';
            }
          } catch (error) {
            console.error('Failed to fetch series name:', error);
          }
        }
        
        return {
          id: doc.id,
          code: data.code,
          name: data.name,
          status: data.status || '啟用', // 確保狀態有預設值
          seriesName,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }));

      setProducts(productsList);

             setFragrance({
         id: fragranceDoc.id,
         code: data.code,
         name: data.name,
         fragranceType: data.fragranceType || data.status,
         fragranceStatus: data.fragranceStatus || data.status || 'active',
         supplierRef: data.supplierRef,
         supplierName,
         costPerUnit: data.costPerUnit,
         percentage: data.percentage,
         pgRatio: data.pgRatio,
         vgRatio: data.vgRatio,
         description: data.description,
         notes: data.notes,
         status: data.status,
         createdAt: data.createdAt?.toDate() || new Date(),
         createdBy: data.createdBy,
         createdByName,
         productCount: productsList.length,
         remarks: data.remarks, // 更新備註
       });
    } catch (error) {
      console.error('Failed to refresh fragrance data:', error);
      setError('重新載入香精資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const getFragranceTypeText = (type: string) => {
    switch (type) {
      case '棉芯':
        return '棉芯';
      case '陶瓷芯':
        return '陶瓷芯';
      case '棉陶芯通用':
        return '棉陶芯通用';
      default:
        return type || '未指定';
    }
  };

  const getFragranceTypeColor = (type: string) => {
    switch (type) {
      case '棉芯':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '陶瓷芯':
        return 'bg-green-100 text-green-800 border-green-300';
      case '棉陶芯通用':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 格式化使用產品列表顯示
  const formatProductList = (products: Product[]) => {
    if (products.length === 0) {
      return '暫無產品使用';
    }
    
    const productNames = products.slice(0, 3).map(p => `${p.seriesName || '未指定'}-${p.name}`);
    if (products.length <= 3) {
      return productNames.join('\n');
    } else {
      return productNames.join('\n') + '\n...';
    }
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

  if (error || !fragrance) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '香精不存在'}</p>
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
            香精詳情
          </h1>
          <p className="text-muted-foreground font-mono">{fragrance.code}</p>
        </div>
        <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="mr-2 h-4 w-4" />
          編輯香精
        </Button>
      </div>

             {/* 香精基本資訊卡片 */}
       <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-primary/10">
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-primary">
             核心資訊
           </CardTitle>
         </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 香精名稱 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">香精名稱</p>
                <p className="text-lg font-semibold text-blue-800">{fragrance.name}</p>
              </div>
            </div>

            {/* 香精編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">香精編號</p>
                <p className="text-lg font-semibold text-green-800">{fragrance.code}</p>
              </div>
            </div>

                         {/* 使用產品列表 */}
             <div 
               className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg cursor-pointer hover:from-purple-100 hover:to-purple-200 transition-all duration-200"
               onClick={() => products.length > 0 && router.push(`/dashboard/products/${products[0].id}`)}
             >
               <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                 <Package className="h-5 w-5 text-white" />
               </div>
               <div>
                 <p className="text-sm text-purple-600 font-medium">使用產品列表</p>
                 <p className="text-sm font-semibold text-purple-800 whitespace-pre-line leading-tight">
                   {formatProductList(products)}
                 </p>
               </div>
             </div>

                         {/* 供應商 */}
             <div 
               className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg cursor-pointer hover:from-orange-100 hover:to-orange-200 transition-all duration-200"
               onClick={handleSupplierClick}
             >
               <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                 <Building className="h-5 w-5 text-white" />
               </div>
               <div>
                 <p className="text-sm text-orange-600 font-medium">供應商</p>
                 <p className="text-lg font-semibold text-orange-800">{fragrance.supplierName}</p>
               </div>
             </div>
          </div>
        </CardContent>
      </Card>



      {/* 香精詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">香精名稱</span>
                <span className="font-medium">{fragrance.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">香精編號</span>
                <span className="font-medium">{fragrance.code}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">香精種類</span>
                <Badge className={getFragranceTypeColor(fragrance.fragranceType || '')}>
                  {getFragranceTypeText(fragrance.fragranceType || '')}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">啟用狀態</span>
                <Badge className={
                  fragrance.fragranceStatus === '啟用' ? 'bg-green-100 text-green-800 border-green-300' :
                  fragrance.fragranceStatus === '備用' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  fragrance.fragranceStatus === '棄用' ? 'bg-red-100 text-red-800 border-red-300' :
                  'bg-gray-100 text-gray-800 border-gray-300'
                }>
                  {fragrance.fragranceStatus || '未指定'}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">單位成本</span>
                <span className="font-medium text-green-600">
                  ${fragrance.costPerUnit?.toFixed(2) || '0.00'} / KG
                </span>
              </div>
              
            </div>
          </CardContent>
        </Card>

                 {/* 配方欄位 */}
         <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
           <CardHeader>
             <CardTitle className="text-lg text-primary">配方欄位 (計算後)</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-3">
               {(() => {
                 const correctRatios = calculateCorrectRatios(
                   fragrance.percentage || 0,
                   fragrance.pgRatio || 0,
                   fragrance.vgRatio || 0
                 );
                 return (
                   <>
                     <div className="flex justify-between items-center py-2 border-b border-blue-200">
                       <span className="text-muted-foreground">香精比例</span>
                       <span className="font-medium text-blue-600">
                         {correctRatios.fragrance}%
                       </span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-blue-200">
                       <span className="text-muted-foreground">PG比例</span>
                       <span className="font-medium text-green-600">
                         {correctRatios.pg}%
                       </span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-blue-200">
                       <span className="text-muted-foreground">VG比例</span>
                       <span className="font-medium text-purple-600">
                         {correctRatios.vg}%
                       </span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-blue-200">
                       <span className="text-muted-foreground">總比例</span>
                       <span className="font-medium text-orange-600">
                         {correctRatios.total}%
                       </span>
                     </div>
                   </>
                 );
               })()}
             </div>
           </CardContent>
         </Card>

                 {/* 使用產品列表 */}
         <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
           <CardHeader>
             <CardTitle className="text-lg text-primary">使用產品 ({fragrance.productCount})</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             {products.length > 0 ? (
               <div className="space-y-2">
                 {products.map((product) => (
                   <div 
                     key={product.id}
                     className="flex items-center justify-between p-2 bg-white rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors duration-200"
                     onClick={() => router.push(`/dashboard/products/${product.id}`)}
                   >
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                       <div>
                         <span className="text-sm font-medium text-gray-800">{product.name}</span>
                         <div className="text-xs text-gray-500">代號: {product.code}</div>
                       </div>
                     </div>
                     <Badge className={
                       product.status === '啟用' ? 'bg-green-100 text-green-800 border-green-300' :
                       product.status === '備用' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                       product.status === '棄用' ? 'bg-red-100 text-red-800 border-red-300' :
                       'bg-gray-100 text-gray-800 border-gray-300'
                     }>
                       {product.status || '未指定'}
                     </Badge>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-8">
                 <div className="text-muted-foreground">暫無產品使用此香精</div>
                 <div className="text-sm text-muted-foreground mt-1">在產品管理中為產品分配此香精</div>
               </div>
             )}
           </CardContent>
         </Card>
      </div>

      {/* 備註 */}
      <Card className="mt-6 border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg text-yellow-800">
            <span>備註</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditRemarksOpen(true)}
              className="flex items-center gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <Edit className="h-3 w-3" />
              編輯
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fragrance.remarks ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-yellow-900">{fragrance.remarks}</p>
          ) : (
            <p className="text-sm text-yellow-600">暫無備註</p>
          )}
        </CardContent>
      </Card>

      {/* 描述和備註 */}
      {(fragrance.description || fragrance.notes) && (
        <Card className="mt-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">詳細資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fragrance.description && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">香精描述</h4>
                <p className="text-sm leading-relaxed">{fragrance.description}</p>
              </div>
            )}
            {fragrance.notes && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">備註</h4>
                <p className="text-sm leading-relaxed">{fragrance.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* 編輯香精對話框 */}
      {fragrance && (
        <FragranceDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onFragranceUpdate={handleFragranceUpdate}
          fragranceData={{
            ...fragrance,
            currentStock: 0, // 添加缺失的屬性
          } as FragranceData}
        />
      )}

      {/* 編輯備註對話框 */}
      {fragrance && (
                 <FragranceDialog
           isOpen={isEditRemarksOpen}
           onOpenChange={setIsEditRemarksOpen}
           onFragranceUpdate={handleFragranceUpdate}
           fragranceData={{
             ...fragrance,
             currentStock: 0, // 添加缺少的屬性
             remarks: fragrance.remarks || '', // 傳入當前備註
           } as FragranceData}
         />
      )}

      {/* 供應商詳情對話框 */}
      <DetailViewDialog
        isOpen={isSupplierDetailOpen}
        onOpenChange={setIsSupplierDetailOpen}
        title="供應商詳情"
        subtitle={supplierData ? `查看供應商「${supplierData.name}」的詳細資訊` : ''}
        sections={supplierData ? [
          {
            title: "基本資訊",
            icon: <Building className="h-4 w-4" />,
            color: "blue",
            fields: [
              {
                label: "供應商名稱",
                value: supplierData.name || '-',
                icon: <Building className="h-3 w-3" />
              },
              {
                label: "供應商品",
                value: supplierData.products || '未指定',
                icon: <Package className="h-3 w-3" />
              }
            ]
          },
          {
            title: "聯絡資訊",
            icon: <User className="h-4 w-4" />,
            color: "green",
            fields: [
              {
                label: "聯絡窗口",
                value: supplierData.contactWindow || '未指定',
                icon: <User className="h-3 w-3" />
              },
              {
                label: "對接人員",
                value: supplierData.liaisonPersonName || '未指定',
                icon: <User className="h-3 w-3" />
              },
              {
                label: "聯絡方式",
                value: supplierData.contactMethod || '未指定',
                icon: <Phone className="h-3 w-3" />
              }
            ]
          }
        ] : []}
        actions={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSupplierDetailOpen(false)}>
              關閉
            </Button>
            {supplierData && (
              <Button 
                onClick={() => {
                  setIsSupplierDetailOpen(false)
                  // 這裡可以添加編輯供應商的邏輯
                  // 或者導航到供應商編輯頁面
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                編輯供應商
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
