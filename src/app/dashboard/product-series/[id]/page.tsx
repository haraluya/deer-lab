'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, DocumentReference, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Loader2, Package, User, Calendar, Tag, Edit, Plus, X, Package2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProductSeries {
  id: string;
  code: string;
  name: string;
  productType: string;
  commonMaterials: DocumentReference[];
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  productCount: number;
}

interface Material {
  id: string;
  name: string;
  code: string;
  category?: string;
  subCategory?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  status: '啟用' | '備用' | '棄用';
  nicotineMg: number;
  fragranceName?: string;
  createdAt: Date;
}

export default function ProductSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [series, setSeries] = useState<ProductSeries | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

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

        // 獲取該系列下的產品
        const productsQuery = query(
          collection(db, 'products'),
          where('seriesRef', '==', doc(db, 'productSeries', params.id))
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = await Promise.all(productsSnapshot.docs.map(async (productDoc) => {
          const productData = productDoc.data();
          
          // 獲取香精名稱
          let fragranceName = '未知';
          if (productData.currentFragranceRef) {
            try {
              const fragranceDoc = await getDoc(productData.currentFragranceRef);
              if (fragranceDoc.exists()) {
                fragranceName = (fragranceDoc.data() as any).name;
              }
            } catch (error) {
              console.error('Failed to fetch fragrance name:', error);
            }
          }

          return {
            id: productDoc.id,
            name: productData.name,
            code: productData.code,
            status: productData.status || '啟用',
            nicotineMg: productData.nicotineMg || 0,
            fragranceName,
            createdAt: productData.createdAt?.toDate() || new Date(),
          } as Product;
        }));

        // 獲取所有物料資料
        const materialsSnapshot = await getDocs(collection(db, 'materials'));
        const allMaterialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          code: doc.data().code,
          category: doc.data().category,
          subCategory: doc.data().subCategory,
        }));

        // 獲取系列使用的物料
        const seriesMaterials: Material[] = [];
        if (data.commonMaterials) {
          for (const materialRef of data.commonMaterials) {
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
              const materialData = materialDoc.data() as any;
              seriesMaterials.push({
                id: materialDoc.id,
                name: materialData.name,
                code: materialData.code,
                category: materialData.category,
                subCategory: materialData.subCategory,
              });
            }
          }
        }

        setAllMaterials(allMaterialsList);
        setMaterials(seriesMaterials);
        setProducts(productsList);

        setSeries({
          id: seriesDoc.id,
          code: data.code,
          name: data.name,
          productType: data.productType || '其他(ETC)',
          commonMaterials: data.commonMaterials || [],
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

  const handleAddMaterial = async () => {
    if (!selectedMaterialId || !series || !db) return;

    try {
      const materialRef = doc(db, 'materials', selectedMaterialId);
      const materialDoc = await getDoc(materialRef);
      
      if (!materialDoc.exists()) {
        toast.error('選擇的物料不存在');
        return;
      }

      const materialData = materialDoc.data() as any;
      const newMaterial: Material = {
        id: materialDoc.id,
        name: materialData.name,
        code: materialData.code,
        category: materialData.category,
        subCategory: materialData.subCategory,
      };

      // 檢查是否已經添加過
      if (materials.some(m => m.id === newMaterial.id)) {
        toast.error('此物料已經在系列中');
        return;
      }

      // 更新資料庫
      const newCommonMaterials = [...series.commonMaterials, materialRef];
      await updateDoc(doc(db, 'productSeries', series.id), {
        commonMaterials: newCommonMaterials,
      });

      // 更新本地狀態
      setMaterials([...materials, newMaterial]);
      setSeries({
        ...series,
        commonMaterials: newCommonMaterials,
      });

      toast.success(`已添加物料: ${newMaterial.name}`);
      setIsAddMaterialOpen(false);
      setSelectedMaterialId('');
    } catch (error) {
      console.error('添加物料失敗:', error);
      toast.error('添加物料失敗');
    }
  };

  const handleRemoveMaterial = async (materialId: string) => {
    if (!series || !db) return;

    try {
      const materialToRemove = materials.find(m => m.id === materialId);
      if (!materialToRemove) return;

      // 更新資料庫
      const newCommonMaterials = series.commonMaterials.filter(ref => ref.id !== materialId);
      await updateDoc(doc(db, 'productSeries', series.id), {
        commonMaterials: newCommonMaterials,
      });

      // 更新本地狀態
      setMaterials(materials.filter(m => m.id !== materialId));
      setSeries({
        ...series,
        commonMaterials: newCommonMaterials,
      });

      toast.success(`已移除物料: ${materialToRemove.name}`);
    } catch (error) {
      console.error('移除物料失敗:', error);
      toast.error('移除物料失敗');
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/product-series?edit=${series?.id}`);
  };

  const handleProductClick = (productId: string) => {
    router.push(`/dashboard/products/${productId}`);
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
            <Button onClick={() => router.push('/dashboard/product-series')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回系列管理
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
          onClick={() => router.push('/dashboard/product-series')}
          className="hover:bg-primary/10 hover:border-primary/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold text-primary">
            系列詳情
          </h1>
          <p className="text-muted-foreground font-mono">{series.name}</p>
        </div>
        <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="mr-2 h-4 w-4" />
          編輯
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
            {/* 系列名稱 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">系列名稱</p>
                <p className="text-lg font-semibold text-blue-800">{series.name}</p>
              </div>
            </div>

            {/* 系列編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">系列編號</p>
                <p className="text-lg font-semibold text-green-800">{series.code}</p>
              </div>
            </div>

            {/* 產品類型 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">產品類型</p>
                <p className="text-lg font-semibold text-purple-800">{series.productType}</p>
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

      {/* 使用材料管理 */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-primary">
              <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Package className="h-3 w-3 text-white" />
              </div>
              使用材料 ({materials.length})
            </CardTitle>
            <Button 
              onClick={() => setIsAddMaterialOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增材料
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {materials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <div 
                  key={material.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{material.name}</div>
                      <div className="text-xs text-muted-foreground">代號: {material.code}</div>
                      {material.category && (
                        <div className="text-xs text-muted-foreground">
                          {material.category} {material.subCategory && `> ${material.subCategory}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMaterial(material.id)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground">此系列暫無使用材料</p>
              <p className="text-sm text-muted-foreground mt-1">點擊「新增材料」來添加常用材料</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 產品明細列表 */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Package2 className="h-3 w-3 text-white" />
            </div>
            產品明細 ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>產品名稱</TableHead>
                    <TableHead>產品代號</TableHead>
                    <TableHead>香精</TableHead>
                    <TableHead>尼古丁濃度</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow 
                      key={product.id}
                      className="hover:bg-primary/5 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleProductClick(product.id)}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.code}</TableCell>
                      <TableCell>{product.fragranceName}</TableCell>
                      <TableCell>{product.nicotineMg}mg</TableCell>
                      <TableCell>
                        <Badge
                          variant={product.status === '啟用' ? 'default' : 'secondary'}
                          className={
                            product.status === '啟用' ? 'bg-green-100 text-green-800' :
                            product.status === '備用' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.createdAt.toLocaleDateString('zh-TW')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product.id);
                          }}
                          className="h-8 w-8"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package2 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground">此系列暫無產品</p>
              <p className="text-sm text-muted-foreground mt-1">在產品管理中新增產品時選擇此系列</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增材料對話框 */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增使用材料</DialogTitle>
            <DialogDescription>
              為此產品系列選擇要添加的常用材料
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                選擇材料
              </label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇要添加的材料" />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials
                    .filter(material => !materials.some(m => m.id === material.id))
                    .map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{material.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              {material.category || '未分類'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                              {material.subCategory || '未分類'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              代號: {material.code}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddMaterialOpen(false);
                  setSelectedMaterialId('');
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleAddMaterial}
                disabled={!selectedMaterialId}
              >
                新增
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
