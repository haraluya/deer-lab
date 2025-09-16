'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, DocumentReference, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiClient } from '@/hooks/useApiClient';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, DollarSign, ShoppingCart, Edit, Droplets, Calculator, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductDialog, ProductData } from '../ProductDialog';
import { RemarksDialog } from './RemarksDialog';
import { FragranceChangeHistory } from '@/types';


interface Product {
  id: string;
  code: string;
  name: string;
  productNumber?: string;
  seriesRef?: DocumentReference;
  seriesName?: string;
  seriesType?: string;
  currentFragranceRef?: DocumentReference;
  fragranceName?: string;
  fragranceCode?: string;
  fragranceFormula?: {
    percentage: number;
    pgRatio: number;
    vgRatio: number;
  };
  nicotineMg?: number;
  targetProduction?: number;
  specificMaterials?: DocumentReference[];
  specificMaterialNames?: string[];
  specificMaterialCodes?: string[];  // 新增：專屬材料代號
  specificMaterialStocks?: { [key: string]: number };
  specificMaterialUnits?: { [key: string]: string };
  commonMaterials?: DocumentReference[];
  commonMaterialNames?: string[];
  commonMaterialCodes?: string[];  // 新增：通用材料代號
  commonMaterialStocks?: { [key: string]: number };
  commonMaterialUnits?: { [key: string]: string };
  description?: string;
  notes?: string;
  status?: '啟用' | '備用' | '棄用';
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  fragranceStock?: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const apiClient = useApiClient();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [targetProduction, setTargetProduction] = useState<number>(1);
  const [targetProductionInput, setTargetProductionInput] = useState<string>('1');
  const [isRemarksDialogOpen, setIsRemarksDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState<string>('');
  const [fragranceHistory, setFragranceHistory] = useState<FragranceChangeHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // 格式化數值顯示，整數不顯示小數點
  const formatNumber = (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(3);
  };

  // 格式化日期
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '未知';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 載入香精更換歷程
  const loadFragranceHistory = async (productId: string) => {
    setIsLoadingHistory(true);
    
    try {
      const result = await apiClient.call('getProductFragranceHistory', { productId });
      console.log('香精歷程載入結果:', result);
      
      // 檢查 API 是否成功返回
      if (result.success && result.data) {
        // 🔧 修復：使用新統一API格式的 records 陣列
        const historyData = Array.isArray(result.data.records) ? result.data.records :
                          Array.isArray(result.data) ? result.data : [];
        setFragranceHistory(historyData);

        console.log(`載入香精歷程成功，共 ${historyData.length} 筆記錄`, {
          rawData: result.data,
          records: historyData
        });
      } else {
        // Function 成功執行但沒有資料，設置空陣列（這是正常情況，不顯示任何通知）
        setFragranceHistory([]);
        console.log('該產品尚無香精更換歷程', { result });
      }
    } catch (error) {
      console.error("載入香精歷程時發生錯誤:", error);
      // 設置空陣列
      setFragranceHistory([]);
      
      // 只在真正的網路錯誤或函數錯誤時才顯示錯誤訊息
      // 排除常見的正常情況（如函數不存在、無權限等）
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        
        // 只在真正的系統錯誤時顯示錯誤訊息，其他情況靜默處理
        if (errorMessage.includes('unavailable') || errorMessage.includes('timeout') || errorMessage.includes('internal')) {
          toast.error("香精歷程載入失敗，請稍後再試");
        }
        // 其他錯誤（如 functions/not-found, permission-denied 等）靜默處理
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };


  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id || typeof params.id !== 'string') {
        setError('產品 ID 無效');
        setIsLoading(false);
        return;
      }

      try {
        if (!db) {
          throw new Error('Firebase 未初始化');
        }
        const productDoc = await getDoc(doc(db, 'products', params.id));
        if (!productDoc.exists()) {
          setError('產品不存在');
          setIsLoading(false);
          return;
        }

        const data = productDoc.data();
        
        // 獲取產品系列名稱和類型
        let seriesName = '未指定';
        let seriesType = '未指定';
        if (data.seriesRef) {
          try {
            const seriesDoc = await getDoc(data.seriesRef);
            if (seriesDoc.exists()) {
              const seriesData = seriesDoc.data() as any;
              seriesName = seriesData?.name || '未指定';
              seriesType = seriesData?.productType || '未指定';
            }
          } catch (error) {
            console.error('Failed to fetch series name:', error);
          }
        }

        // 獲取香精資訊和庫存
        let fragranceName = '未指定';
        let fragranceCode = '';
        let fragranceFormula = { percentage: 0, pgRatio: 0, vgRatio: 0 };
        let fragranceStock = 0;
        if (data.currentFragranceRef) {
          try {
            const fragranceDoc = await getDoc(data.currentFragranceRef);
            if (fragranceDoc.exists()) {
              const fragranceData = fragranceDoc.data() as any;
              fragranceName = fragranceData?.name || '未指定';
              fragranceCode = fragranceData?.code || '';
              fragranceFormula = {
                percentage: fragranceData?.percentage || 0,
                pgRatio: fragranceData?.pgRatio || 0,
                vgRatio: fragranceData?.vgRatio || 0,
              };
              fragranceStock = fragranceData?.currentStock || 0;
            }
          } catch (error) {
            console.error('Failed to fetch fragrance info:', error);
          }
        }

        // 獲取專屬材料名稱、代號、庫存和單位
        let specificMaterialNames: string[] = [];
        let specificMaterialCodes: string[] = [];
        let specificMaterialStocks: { [key: string]: number } = {};
        let specificMaterialUnits: { [key: string]: string } = {};
        if (data.specificMaterials && data.specificMaterials.length > 0) {
          try {
            const materialDocs = await Promise.all(
              data.specificMaterials.map((ref: DocumentReference) => getDoc(ref))
            );
            materialDocs.forEach(doc => {
              if (doc.exists()) {
                const materialData = doc.data() as any;
                specificMaterialNames.push(materialData?.name || '未知材料');
                specificMaterialCodes.push(materialData?.code || doc.id);
                specificMaterialStocks[doc.id] = materialData?.currentStock || 0;
                specificMaterialUnits[doc.id] = materialData?.unit || '個';
              }
            });
          } catch (error) {
            console.error('Failed to fetch specific materials:', error);
          }
        }

        // 獲取通用材料名稱、代號、庫存和單位
        let commonMaterialNames: string[] = [];
        let commonMaterialCodes: string[] = [];
        let commonMaterialStocks: { [key: string]: number } = {};
        let commonMaterialUnits: { [key: string]: string } = {};
        let commonMaterialRefs: DocumentReference[] = [];
        if (data.seriesRef) {
          try {
            const seriesDoc = await getDoc(data.seriesRef);
            if (seriesDoc.exists()) {
              const seriesData = seriesDoc.data() as any;
              if (seriesData.commonMaterials && seriesData.commonMaterials.length > 0) {
                commonMaterialRefs = seriesData.commonMaterials;
                const materialDocs = await Promise.all(
                  seriesData.commonMaterials.map((ref: DocumentReference) => getDoc(ref))
                );
                materialDocs.forEach(doc => {
                  if (doc.exists()) {
                    const materialData = doc.data() as any;
                    commonMaterialNames.push(materialData?.name || '未知材料');
                    commonMaterialCodes.push(materialData?.code || doc.id);
                    commonMaterialStocks[doc.id] = materialData?.currentStock || 0;
                    commonMaterialUnits[doc.id] = materialData?.unit || '個';
                  }
                });
              }
            }
          } catch (error) {
            console.error('Failed to fetch common materials:', error);
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

        const productData = {
          id: productDoc.id,
          code: data.code,
          name: data.name,
          productNumber: data.productNumber,
          seriesRef: data.seriesRef,
          seriesName,
          seriesType,
          currentFragranceRef: data.currentFragranceRef,
          fragranceName,
          fragranceCode,
          fragranceFormula,
          fragranceStock,
          nicotineMg: data.nicotineMg || 0,
          targetProduction: data.targetProduction || 1,
          specificMaterials: data.specificMaterials || [],
          specificMaterialNames,
          specificMaterialCodes,
          specificMaterialStocks,
          specificMaterialUnits,
          commonMaterials: commonMaterialRefs,
          commonMaterialNames,
          commonMaterialCodes,
          commonMaterialStocks,
          commonMaterialUnits,
          description: data.description,
          notes: data.notes,
          status: data.status || '啟用',
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
        };
        
        setProduct(productData);
        setTargetProduction(data.targetProduction || 1);
        setTargetProductionInput((data.targetProduction || 1).toString());
        setRemarks(data.notes || '');
        
        // 載入香精歷程
        await loadFragranceHistory(productDoc.id);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        setError('讀取產品資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();


  }, [params.id]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleProductUpdate = async () => {
    // 重新載入產品資料
    window.location.reload();
  };

  const handleRemarksUpdate = async (newRemarks: string) => {
    try {
      if (!db || !product) {
        throw new Error('資料庫或產品資料未初始化');
      }
      
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        notes: newRemarks,
        updatedAt: new Date(),
      });
      
      setRemarks(newRemarks);
      setIsRemarksDialogOpen(false);
      toast.success('備註已更新');
    } catch (error) {
      console.error('更新備註失敗:', error);
      toast.error('更新備註失敗');
    }
  };

  const handleSeriesClick = () => {
    if (product?.seriesRef) {
      router.push(`/dashboard/product-series/${product.seriesRef.id}`);
    }
  };

  const handleFragranceClick = () => {
    if (product?.currentFragranceRef) {
      router.push(`/dashboard/fragrances/${product.currentFragranceRef.id}`);
    }
  };

  const handleMaterialClick = (materialRef: DocumentReference) => {
    router.push(`/dashboard/materials/${materialRef.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '啟用':
        return 'bg-green-100 text-green-800 border-green-300';
      case '備用':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case '棄用':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '啟用':
        return '啟用';
      case '備用':
        return '備用';
      case '棄用':
        return '棄用';
      default:
        return '未知';
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

  if (error || !product) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '產品不存在'}</p>
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
            產品詳情
          </h1>
          <p className="text-muted-foreground font-mono">{product.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
            <Edit className="mr-2 h-4 w-4" />
            編輯產品
          </Button>
        </div>
      </div>

      {/* 產品基本資訊卡片 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            產品基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 產品名稱 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">產品名稱</p>
                <p className="text-lg font-semibold text-blue-800">{product.name}</p>
              </div>
            </div>

            {/* 產品系列 - 可點擊 */}
            <div 
              className={`flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg ${product.seriesRef ? 'cursor-pointer hover:from-green-100 hover:to-green-200 transition-all duration-200' : ''}`}
              onClick={product.seriesRef ? handleSeriesClick : undefined}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">產品系列</p>
                <p className="text-lg font-semibold text-green-800">
                  {product.seriesName}
                  {product.seriesType && product.seriesType !== '未指定' && (
                    <span className="text-sm font-normal text-green-600 ml-2">
                      ({product.seriesType})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* 使用香精 - 可點擊 */}
            <div 
              className={`flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg ${product.currentFragranceRef ? 'cursor-pointer hover:from-purple-100 hover:to-purple-200 transition-all duration-200' : ''}`}
              onClick={product.currentFragranceRef ? handleFragranceClick : undefined}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">使用香精</p>
                <p className="text-lg font-semibold text-purple-800">{product.fragranceCode || '未指定'}</p>
                <p className="text-xs text-gray-500">庫存: {product.fragranceStock || 0} KG</p>
              </div>
            </div>

            {/* 丁鹽濃度 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">丁鹽濃度</p>
                <p className="text-lg font-semibold text-orange-800">{product.nicotineMg || 0} MG</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 產品詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">產品名稱</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div 
                className={`flex justify-between items-center py-2 border-b ${product.seriesRef ? 'cursor-pointer hover:bg-green-50 transition-colors duration-200' : ''}`}
                onClick={product.seriesRef ? handleSeriesClick : undefined}
              >
                <span className="text-muted-foreground">產品系列</span>
                <span className="font-medium">
                  {product.seriesName}
                  {product.seriesType && product.seriesType !== '未指定' && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({product.seriesType})
                    </span>
                  )}
                </span>
              </div>
              <div 
                className={`flex justify-between items-center py-2 border-b ${product.currentFragranceRef ? 'cursor-pointer hover:bg-purple-50 transition-colors duration-200' : ''}`}
                onClick={product.currentFragranceRef ? handleFragranceClick : undefined}
              >
                <span className="text-muted-foreground">使用香精</span>
                <div className="text-right">
                  <div className="font-medium">
                    {product.fragranceCode && product.fragranceName && product.fragranceName !== '未指定'
                      ? `${product.fragranceCode}(${product.fragranceName})`
                      : product.fragranceCode || '未指定'
                    }
                  </div>
                  <div className="text-xs text-gray-500">庫存: {product.fragranceStock || 0} KG</div>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">丁鹽濃度</span>
                <span className="font-medium">{product.nicotineMg || 0} MG</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">產品狀態</span>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(product.status || '啟用')}`}>
                  {getStatusText(product.status || '啟用')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通用材料 */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-700">通用材料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.commonMaterialNames && product.commonMaterialNames.length > 0 ? (
              <div className="space-y-2">
                {product.commonMaterialNames.map((materialName, index) => {
                  const materialRef = product.commonMaterials?.[index];
                  const materialId = materialRef?.id;
                  const stock = materialId ? product.commonMaterialStocks?.[materialId] || 0 : 0;
                  const unit = materialId ? product.commonMaterialUnits?.[materialId] || '個' : '個';
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200 ${materialRef ? 'cursor-pointer hover:bg-blue-50 transition-colors duration-200' : ''}`}
                      onClick={materialRef ? () => handleMaterialClick(materialRef) : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-800">{materialName}</span>
                      </div>
                      <span className="text-xs text-gray-500">庫存: {stock} {unit}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  該系列尚未設定通用材料
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 專屬材料 */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg text-purple-700">專屬材料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.specificMaterialNames && product.specificMaterialNames.length > 0 ? (
              <div className="space-y-2">
                {product.specificMaterialNames.map((materialName, index) => {
                  const materialRef = product.specificMaterials?.[index];
                  const materialId = materialRef?.id;
                  const stock = materialId ? product.specificMaterialStocks?.[materialId] || 0 : 0;
                  const unit = materialId ? product.specificMaterialUnits?.[materialId] || '個' : '個';
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-2 bg-white rounded-lg border border-purple-200 ${materialRef ? 'cursor-pointer hover:bg-purple-50 transition-colors duration-200' : ''}`}
                      onClick={materialRef ? () => handleMaterialClick(materialRef) : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-purple-800">{materialName}</span>
                      </div>
                      <span className="text-xs text-gray-500">庫存: {stock} {unit}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  尚未選擇專屬材料
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 使用香精 */}
      <Card className="mt-6 border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg text-green-700">使用香精</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {product.fragranceName && product.fragranceName !== '未指定' ? (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              {/* 目標產量輸入 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  產品目標產量 (KG)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={targetProductionInput}
                  onChange={(e) => setTargetProductionInput(e.target.value)}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value > 0) {
                      setTargetProduction(value);
                    } else {
                      setTargetProduction(1);
                      setTargetProductionInput('1');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="輸入目標產量"
                />
              </div>
              
              {/* 配方計算結果 */}
              <div className="space-y-4">
                {/* 第一排：產品目標產量、香精編號、香精名稱 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">產品目標產量 (KG)：</span>
                    <div className="font-medium">{formatNumber(targetProduction)} KG</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">香精編號：</span>
                    <div className="font-medium text-green-800">{product.fragranceCode || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">香精名稱：</span>
                    <div className="font-medium text-green-800">{product.fragranceName}</div>
                  </div>
                </div>
                
                {/* 第二排：香精比例、PG比例、VG比例 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">香精比例：</span>
                    <div className="font-medium text-green-600">{product.fragranceFormula?.percentage || 0}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">PG比例：</span>
                    <div className="font-medium text-blue-600">{product.fragranceFormula?.pgRatio || 0}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">VG比例：</span>
                    <div className="font-medium text-purple-600">{product.fragranceFormula?.vgRatio || 0}%</div>
                  </div>
                </div>
                
                {/* 第三排：需要香精、需要PG、需要VG */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">需要香精：</span>
                    <div className="font-medium text-green-600">
                      {formatNumber(targetProduction * ((product.fragranceFormula?.percentage || 0) / 100))} KG
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">需要PG：</span>
                    <div className="font-medium text-blue-600">
                      {formatNumber(targetProduction * ((product.fragranceFormula?.pgRatio || 0) / 100))} KG
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">需要VG：</span>
                    <div className="font-medium text-purple-600">
                      {formatNumber(targetProduction * ((product.fragranceFormula?.vgRatio || 0) / 100))} KG
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                尚未選擇香精
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 香精更換歷程區塊 */}
      <Card className="mt-6 border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-lg text-indigo-700 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <History className="h-4 w-4 text-white" />
            </div>
            香精更換歷程
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center items-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-2 border-indigo-200 rounded-full animate-spin border-t-indigo-600"></div>
                <span className="text-indigo-600 font-medium">載入歷程中...</span>
              </div>
            </div>
          ) : fragranceHistory.length > 0 ? (
            <div className="space-y-4">
              {fragranceHistory.map((record, index) => (
                <div key={record.id} className="bg-white rounded-lg p-4 border border-indigo-200 relative">
                  {/* 時間軸連接線 */}
                  {index < fragranceHistory.length - 1 && (
                    <div className="absolute left-6 top-12 w-px h-8 bg-indigo-300"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* 時間軸圓點 */}
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    
                    <div className="flex-1 min-w-0">
                      {/* 頭部：日期和操作人員 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm font-medium text-indigo-700">
                            {formatDate(record.changeDate)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          操作人員：{record.changedByName}
                        </span>
                      </div>
                      
                      {/* 香精更換資訊 */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium text-gray-700">香精更換</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap ml-6">
                          <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                            {record.oldFragranceCode}
                          </Badge>
                          <span className="text-gray-400 text-xs">→</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            {record.newFragranceCode}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 ml-6">
                          {record.oldFragranceName} → {record.newFragranceName}
                        </div>
                      </div>
                      
                      {/* 更換原因 */}
                      <div className="bg-gray-50 rounded-md p-2 ml-6">
                        <div className="text-xs text-gray-500 mb-1">更換原因</div>
                        <div className="text-sm text-gray-700">{record.changeReason}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <History className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">無更換歷程</h3>
              <p className="text-gray-500 text-center">
                此產品尚未有香精更換記錄
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 備註區塊 */}
      <Card className="mt-6 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-primary font-bold">備註</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRemarksDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              編輯
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[100px] bg-white rounded-lg border border-gray-200 p-4">
            {remarks ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{remarks}</p>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">暫無備註</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 編輯產品對話框 */}
      {product && (
        <ProductDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onProductUpdate={handleProductUpdate}
          productData={{
            id: product.id,
            name: product.name,
            code: product.code,
            productNumber: product.productNumber,
            seriesRef: product.seriesRef,
            currentFragranceRef: product.currentFragranceRef,
            specificMaterials: product.specificMaterials || [],
            nicotineMg: product.nicotineMg || 0,
          } as ProductData}
        />
      )}

      {/* 備註編輯對話框 */}
      <RemarksDialog
        isOpen={isRemarksDialogOpen}
        onOpenChange={setIsRemarksDialogOpen}
        onSave={handleRemarksUpdate}
        currentRemarks={remarks}
      />


    </div>
  );
}
