'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, ShoppingCart, Edit, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeriesDialog, SeriesData } from '../SeriesDialog';

interface ProductSeries {
  id: string;
  code: string;
  name: string;
  category?: string;
  subCategory?: string;
  description?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  productCount: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: Date;
}

export default function ProductSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [series, setSeries] = useState<ProductSeries | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSeries = async () => {
      if (!params.id || typeof params.id !== 'string') {
        setError('產品系列 ID 無效');
        setIsLoading(false);
        return;
      }

      try {
        if (!db) {
          throw new Error('Firebase 未初始化');
        }
        const seriesDoc = await getDoc(doc(db, 'productSeries', params.id));
        if (!seriesDoc.exists()) {
          setError('產品系列不存在');
          setIsLoading(false);
          return;
        }

        const data = seriesDoc.data();

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

        // 獲取該系列下的產品數量
        const productsQuery = query(
          collection(db, 'products'),
          where('seriesRef', '==', doc(db, 'productSeries', params.id))
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          code: doc.data().code,
          name: doc.data().name,
          status: doc.data().status,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));

        setProducts(productsList);

        setSeries({
          id: seriesDoc.id,
          code: data.code,
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          description: data.description,
          notes: data.notes,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
          productCount: productsList.length,
        });
      } catch (error) {
        console.error('Failed to fetch series:', error);
        setError('讀取產品系列資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, [params.id]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleSeriesUpdate = async () => {
    // 重新載入產品系列資料
    window.location.reload();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-300';
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

  if (error || !series) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '產品系列不存在'}</p>
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
            產品系列詳情
          </h1>
          <p className="text-muted-foreground font-mono">{series.code}</p>
        </div>
        <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="mr-2 h-4 w-4" />
          編輯系列
        </Button>
      </div>

      {/* 系列基本資訊卡片 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Package2 className="h-4 w-4 text-white" />
            </div>
            系列基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 系列編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">系列編號</p>
                <p className="text-lg font-semibold text-blue-800">{series.code}</p>
              </div>
            </div>

            {/* 產品數量 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">產品數量</p>
                <p className="text-lg font-semibold text-green-800">{series.productCount}</p>
              </div>
            </div>

            {/* 建立人員 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">建立人員</p>
                <p className="text-lg font-semibold text-purple-800">{series.createdByName}</p>
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
                  {series.createdAt.toLocaleDateString('zh-TW')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系列詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">系列名稱</span>
                <span className="font-medium">{series.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">主分類</span>
                <span className="font-medium">{series.category || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">細分分類</span>
                <span className="font-medium">{series.subCategory || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">狀態</span>
                <Badge className={getStatusColor(series.status)}>
                  {getStatusText(series.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 描述和備註 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">詳細資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {series.description && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">系列描述</h4>
                <p className="text-sm leading-relaxed">{series.description}</p>
              </div>
            )}
            {series.notes && (
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">備註</h4>
                <p className="text-sm leading-relaxed">{series.notes}</p>
              </div>
            )}
            {!series.description && !series.notes && (
              <p className="text-sm text-muted-foreground">暫無詳細資訊</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 產品列表 */}
      <Card className="mt-6 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Package className="h-3 w-3 text-white" />
            </div>
            系列產品 ({series.productCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>產品資訊</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>建立時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow 
                    key={product.id}
                    className="hover:bg-primary/5 transition-colors duration-200 cursor-pointer"
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-xs text-muted-foreground">代號: {product.code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'active' ? 'success' : 'destructive'}>
                        {product.status === 'active' ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {product.createdAt.toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground">此系列暫無產品</p>
              <p className="text-sm text-muted-foreground mt-1">點擊「編輯系列」來管理產品</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編輯產品系列對話框 */}
      {series && (
        <SeriesDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSeriesUpdate={handleSeriesUpdate}
          seriesData={{
            ...series,
            commonMaterials: [], // 添加缺失的屬性
          } as SeriesData}
        />
      )}
    </div>
  );
}
