'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, Building, User, Calendar, Tag, Droplets, Edit, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FragranceDialog, FragranceData } from '../FragranceDialog';

interface Fragrance {
  id: string;
  code: string;
  name: string;
  category?: string;
  subCategory?: string;
  supplierRef?: any;
  supplierName?: string;
  costPerUnit?: number;
  unit?: string;
  description?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'discontinued';
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

export default function FragranceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
          where('fragranceRef', '==', doc(db, 'fragrances', params.id))
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

        setFragrance({
          id: fragranceDoc.id,
          code: data.code,
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          supplierRef: data.supplierRef,
          supplierName,
          costPerUnit: data.costPerUnit,
          unit: data.unit,
          description: data.description,
          notes: data.notes,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
          productCount: productsList.length,
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

  const handleFragranceUpdate = async () => {
    // 重新載入香精資料
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
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            香精基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 香精編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">香精編號</p>
                <p className="text-lg font-semibold text-blue-800">{fragrance.code}</p>
              </div>
            </div>

            {/* 供應商 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">供應商</p>
                <p className="text-lg font-semibold text-green-800">{fragrance.supplierName}</p>
              </div>
            </div>

            {/* 建立人員 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">建立人員</p>
                <p className="text-lg font-semibold text-purple-800">{fragrance.createdByName}</p>
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
                  {fragrance.createdAt.toLocaleDateString('zh-TW')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 香精詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <span className="text-muted-foreground">主分類</span>
                <span className="font-medium">{fragrance.category || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">細分分類</span>
                <span className="font-medium">{fragrance.subCategory || '未分類'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">狀態</span>
                <Badge className={getStatusColor(fragrance.status)}>
                  {getStatusText(fragrance.status)}
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
                <span className="text-muted-foreground">單位成本</span>
                <span className="font-medium text-green-600">
                  ${fragrance.costPerUnit?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">單位</span>
                <span className="font-medium text-blue-600">
                  {fragrance.unit || '未指定'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">使用產品數</span>
                <span className="font-medium text-purple-600">
                  {fragrance.productCount} 個產品
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* 使用產品列表 */}
      <Card className="mt-6 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Package className="h-3 w-3 text-white" />
            </div>
            使用產品 ({fragrance.productCount})
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
              <p className="text-muted-foreground">暫無產品使用此香精</p>
              <p className="text-sm text-muted-foreground mt-1">在產品管理中為產品分配此香精</p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
