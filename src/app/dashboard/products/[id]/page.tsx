'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, DollarSign, ShoppingCart, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductDialog, ProductData } from '../ProductDialog';

interface Product {
  id: string;
  code: string;
  name: string;
  seriesRef?: DocumentReference;
  seriesName?: string;
  category?: string;
  subCategory?: string;
  cost?: number;
  price?: number;
  status: 'active' | 'inactive' | 'discontinued';
  description?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        
        // 獲取產品系列名稱
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

        setProduct({
          id: productDoc.id,
          code: data.code,
          name: data.name,
          seriesRef: data.seriesRef,
          seriesName,
          category: data.category,
          subCategory: data.subCategory,
          cost: data.cost,
          price: data.price,
          status: data.status,
          description: data.description,
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
        });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'discontinued':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '啟用';
      case 'inactive':
        return '停用';
      case 'discontinued':
        return '停產';
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
        <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="mr-2 h-4 w-4" />
          編輯產品
        </Button>
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
            {/* 產品編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">產品編號</p>
                <p className="text-lg font-semibold text-blue-800">{product.code}</p>
              </div>
            </div>

            {/* 產品系列 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">產品系列</p>
                <p className="text-lg font-semibold text-green-800">{product.seriesName}</p>
              </div>
            </div>

            {/* 建立人員 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">建立人員</p>
                <p className="text-lg font-semibold text-purple-800">{product.createdByName}</p>
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
                  {product.createdAt.toLocaleDateString('zh-TW')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 產品詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">主分類</span>
                <span className="font-medium">{product.category || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">細分分類</span>
                <span className="font-medium">{product.subCategory || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">狀態</span>
                <Badge className={getStatusColor(product.status)}>
                  {getStatusText(product.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 價格資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">價格資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">成本</span>
                <span className="font-medium text-green-600">
                  ${product.cost?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">售價</span>
                <span className="font-medium text-blue-600">
                  ${product.price?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">利潤</span>
                <span className="font-medium text-purple-600">
                  ${((product.price || 0) - (product.cost || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">利潤率</span>
                <span className="font-medium text-orange-600">
                  {product.cost && product.price 
                    ? (((product.price - product.cost) / product.cost) * 100).toFixed(1) + '%'
                    : '0.0%'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 描述和備註 */}
      {(product.description || product.notes) && (
        <Card className="mt-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">詳細資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.description && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">產品描述</h4>
                <p className="text-sm leading-relaxed">{product.description}</p>
              </div>
            )}
            {product.notes && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">備註</h4>
                <p className="text-sm leading-relaxed">{product.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 編輯產品對話框 */}
      {product && (
        <ProductDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onProductUpdate={handleProductUpdate}
          productData={{
            ...product,
            currentFragranceRef: product.seriesRef || null, // 添加缺失的屬性
            specificMaterials: [], // 添加缺失的屬性
            nicotineMg: 0, // 添加缺失的屬性
          } as ProductData}
        />
      )}
    </div>
  );
}
