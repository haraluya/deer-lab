// src/app/dashboard/production-calculator/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, DocumentData, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiForm } from '@/hooks/useApiClient';
import { toast } from 'sonner';
import { Calculator, Factory, Loader2, ChevronsRight, Package, Droplets, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  code: string;
}

interface BomItem {
  name: string;
  code: string;
  quantity: number;
  unit: string;
}

// --- **修正點：為 Firestore 文件定義明確的類型** ---
interface ProductDoc {
  currentFragranceRef?: DocumentReference;
  nicotineMg?: number;
}

interface FragranceDoc {
  name: string;
  code: string;
  percentage: number;
  pgRatio: number;
  vgRatio: number;
}
// ----------------------------------------------------

function ProductionCalculatorPageContent() {
  const router = useRouter();
  const apiClient = useApiForm();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<number>(1000);
  const [billOfMaterials, setBillOfMaterials] = useState<BomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 格式化數值顯示，整數不顯示小數點
  const formatNumber = (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(3);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!db) {
          throw new Error("Firebase 未初始化")
        }
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          code: doc.data().code,
        })) as Product[];
        setProducts(productsList);
      } catch (error) {
        toast.error('讀取產品列表失敗。');
      }
    };
    fetchProducts();
  }, []);

  const handleCalculateBOM = async () => {
    if (!selectedProductId || targetQuantity <= 0) {
      toast.warning('請選擇一個產品並輸入有效的目標產量。');
      return;
    }
    setIsLoading(true);
    setBillOfMaterials([]); // Clear previous results

    try {
        // This is a simplified frontend calculation for display purposes.
        // The backend will perform the definitive calculation when creating the work order.
        const productRef = doc(db!, 'products', selectedProductId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
            throw new Error('找不到產品資料');
        }
        // --- **修正點：使用類型斷言** ---
        const productData = productSnap.data() as ProductDoc;
        const bom: BomItem[] = [];

        // Fragrance
        if (productData.currentFragranceRef) {
            const fragranceSnap = await getDoc(productData.currentFragranceRef);
            if(fragranceSnap.exists()) {
                // --- **修正點：使用類型斷言** ---
                const fragranceData = fragranceSnap.data() as FragranceDoc;
                bom.push({
                    name: fragranceData.name,
                    code: fragranceData.code,
                    quantity: (targetQuantity * fragranceData.percentage) / 100,
                    unit: 'kg'
                });
            }
        }

        // Base materials - 從香精配方中抓取原始數據
        if (productData.currentFragranceRef) {
            const fragranceSnap = await getDoc(productData.currentFragranceRef);
            if(fragranceSnap.exists()) {
                const fragranceData = fragranceSnap.data() as FragranceDoc;
                
                // 使用香精配方中儲存的原始PG和VG比例
                if (fragranceData.pgRatio && fragranceData.pgRatio > 0) {
                    bom.push({
                        name: 'PG (Propylene Glycol)',
                        code: 'PG001',
                        quantity: (targetQuantity * fragranceData.pgRatio) / 100,
                        unit: 'kg'
                    });
                }
                
                if (fragranceData.vgRatio && fragranceData.vgRatio > 0) {
                    bom.push({
                        name: 'VG (Vegetable Glycerin)',
                        code: 'VG001',
                        quantity: (targetQuantity * fragranceData.vgRatio) / 100,
                        unit: 'kg'
                    });
                }
            }
        }

        // Nicotine (if applicable)
        if (productData.nicotineMg && productData.nicotineMg > 0) {
            bom.push({
                name: 'Nicotine Salt',
                code: 'NIC001',
                quantity: (targetQuantity * productData.nicotineMg) / 250, // Convert mg to kg
                unit: 'kg'
            });
        }

        setBillOfMaterials(bom);
        toast.success('BOM 計算完成！');
    } catch (error) {
        console.error('計算 BOM 失敗:', error);
        toast.error('計算 BOM 失敗，請重試。');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!selectedProductId || targetQuantity <= 0 || billOfMaterials.length === 0) {
      toast.warning('請先計算 BOM 再建立工單。');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.call('createWorkOrder', {
        productId: selectedProductId,
        quantity: targetQuantity,
        priority: 'normal' as const,
        notes: `BOM 項目: ${billOfMaterials.map(item => item.name).join(', ')}`
      });
      
      if (result.success) {
        toast.success('工單建立成功！');
        router.push('/dashboard/work-orders');
      }
    } catch (error) {
      console.error('建立工單失敗:', error);
      toast.error('建立工單失敗，請重試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            生產計算器
          </h1>
          <p className="text-gray-600 mt-2">計算生產配方與物料需求</p>
        </div>
      </div>

      {/* 桌面版佈局 */}
      <div className="hidden lg:grid grid-cols-2 gap-8">
        {/* 計算器設定 */}
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-800">
              <Calculator className="h-5 w-5" />
              生產參數設定
            </CardTitle>
            <CardDescription className="text-violet-600">
              選擇產品並設定目標產量
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product" className="text-violet-700 font-medium">選擇產品</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="border-violet-200 focus:border-violet-500 focus:ring-violet-500">
                  <SelectValue placeholder="請選擇產品" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-violet-600" />
                        <span>{product.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {product.code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-violet-700 font-medium">目標產量 (ml)</Label>
              <Input
                id="quantity"
                type="number"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Number(e.target.value))}
                placeholder="輸入目標產量"
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                min="1"
              />
            </div>

            <Button 
              onClick={handleCalculateBOM}
              disabled={!selectedProductId || targetQuantity <= 0 || isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  計算中...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  計算 BOM
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 產品資訊 */}
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Factory className="h-5 w-5" />
              產品資訊
            </CardTitle>
            <CardDescription className="text-purple-600">
              當前選擇的產品詳細資訊
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedProduct ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">產品代號: {selectedProduct.code}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium">目標產量</div>
                    <div className="text-lg font-bold text-purple-900">{targetQuantity.toLocaleString()} ml</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium">預計成本</div>
                    <div className="text-lg font-bold text-purple-900">
                      ${(targetQuantity * 0.1).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>請選擇一個產品</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 手機版佈局 */}
      <div className="lg:hidden space-y-6">
        {/* 計算器設定 */}
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-800">
              <Calculator className="h-5 w-5" />
              生產參數設定
            </CardTitle>
            <CardDescription className="text-violet-600">
              選擇產品並設定目標產量
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product" className="text-violet-700 font-medium">選擇產品</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="border-violet-200 focus:border-violet-500 focus:ring-violet-500">
                  <SelectValue placeholder="請選擇產品" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-violet-600" />
                        <span>{product.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {product.code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-violet-700 font-medium">目標產量 (ml)</Label>
              <Input
                id="quantity"
                type="number"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Number(e.target.value))}
                placeholder="輸入目標產量"
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                min="1"
              />
            </div>

            <Button 
              onClick={handleCalculateBOM}
              disabled={!selectedProductId || targetQuantity <= 0 || isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  計算中...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  計算 BOM
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 產品資訊 */}
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Factory className="h-5 w-5" />
              產品資訊
            </CardTitle>
            <CardDescription className="text-purple-600">
              當前選擇的產品詳細資訊
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedProduct ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">產品代號: {selectedProduct.code}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium">目標產量</div>
                    <div className="text-lg font-bold text-purple-900">{targetQuantity.toLocaleString()} ml</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium">預計成本</div>
                    <div className="text-lg font-bold text-purple-900">
                      ${(targetQuantity * 0.1).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>請選擇一個產品</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BOM 結果 - 桌面版 */}
      {billOfMaterials.length > 0 && (
        <div className="hidden lg:block">
          <Card className="mt-8 bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Droplets className="h-5 w-5 text-violet-600" />
              物料清單 (BOM)
            </CardTitle>
            <CardDescription>
              生產 {targetQuantity.toLocaleString()} ml 所需的物料清單
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="table-responsive">
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">物料名稱</TableHead>
                    <TableHead className="text-left">代號</TableHead>
                    <TableHead className="text-right">需求數量</TableHead>
                    <TableHead className="text-right">單位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billOfMaterials.map((item, index) => (
                    <TableRow key={index} className="hover:bg-violet-50/50 transition-colors duration-200">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Droplets className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="number-display number-positive font-semibold">
                          {formatNumber(item.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-gray-600">{item.unit}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateWorkOrder}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  建立工單中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  建立工單
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        </div>
      )}

      {/* BOM 結果 - 手機版 */}
      {billOfMaterials.length > 0 && (
        <div className="lg:hidden">
          <Card className="mt-6 bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Droplets className="h-5 w-5 text-violet-600" />
                物料清單 (BOM)
              </CardTitle>
              <CardDescription>
                生產 {targetQuantity.toLocaleString()} ml 所需的物料清單
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billOfMaterials.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-violet-50/50 transition-colors duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Droplets className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.code}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-gray-500">需求數量</span>
                        </div>
                        <span className="number-display number-positive font-semibold text-sm">
                          {formatNumber(item.quantity)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-gray-500">單位</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCreateWorkOrder}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    建立工單中...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    建立工單
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}


export default function ProductionCalculatorPage() {
  return (
    <ProductionCalculatorPageContent />
  );
}
