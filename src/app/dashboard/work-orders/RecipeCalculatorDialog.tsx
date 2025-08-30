'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { 
  Calculator, Package, Droplets, FlaskConical, Plus, 
  Loader2, CheckCircle, AlertCircle, X, Save
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  code: string;
  seriesName?: string;
  fragranceRef?: any;
  fragranceName?: string;
  fragranceCode?: string;
  nicotineMg?: number;
}

interface Fragrance {
  id: string;
  name: string;
  code: string;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
}

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
}

interface BomItem {
  id: string;
  name: string;
  code: string;
  type: 'fragrance' | 'material';
  unit: string;
  ratio: number;
  requiredQuantity: number;
  currentStock: number;
  isCalculated: boolean;
}

interface RecipeCalculatorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkOrderCreated: () => void;
  initialProductId?: string; // 從產品詳情頁面傳入的產品ID
}

export function RecipeCalculatorDialog({ 
  isOpen, 
  onOpenChange, 
  onWorkOrderCreated,
  initialProductId 
}: RecipeCalculatorDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<number>(1);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 載入產品、香精和物料資料
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化");
      }

      // 載入產品
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsList = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          seriesName: data.seriesName,
          fragranceRef: data.currentFragranceRef,
          fragranceName: data.fragranceName,
          fragranceCode: data.fragranceCode,
          nicotineMg: data.nicotineMg,
        };
      });
      setProducts(productsList);

      // 載入香精
      const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'));
      const fragrancesList = fragrancesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          percentage: data.percentage,
          pgRatio: data.pgRatio,
          vgRatio: data.vgRatio,
        };
      });
      setFragrances(fragrancesList);

      // 載入物料
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      const materialsList = materialsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          unit: data.unit || 'KG',
          currentStock: data.currentStock || 0,
        };
      });
      setMaterials(materialsList);

    } catch (error) {
      console.error("載入資料失敗:", error);
      toast.error("載入資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 計算配方
  const calculateRecipe = useCallback(() => {
    if (!selectedProductId || targetQuantity <= 0) {
      setBomItems([]);
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    const selectedFragrance = fragrances.find(f => f.code === selectedProduct.fragranceCode);
    if (!selectedFragrance) return;

    const newBomItems: BomItem[] = [];

    // 1. 香精
    if (selectedFragrance.percentage) {
      const fragranceQuantity = (targetQuantity * selectedFragrance.percentage) / 100;
      const fragranceMaterial = materials.find(m => m.code === selectedFragrance.code);
      
      newBomItems.push({
        id: selectedFragrance.id,
        name: selectedFragrance.name,
        code: selectedFragrance.code,
        type: 'fragrance',
        unit: 'KG',
        ratio: selectedFragrance.percentage,
        requiredQuantity: fragranceQuantity,
        currentStock: fragranceMaterial?.currentStock || 0,
        isCalculated: true,
      });
    }

    // 2. PG (丙二醇)
    if (selectedFragrance.pgRatio) {
      const pgQuantity = (targetQuantity * selectedFragrance.pgRatio) / 100;
      const pgMaterial = materials.find(m => m.name.includes('PG丙二醇') || m.code.includes('PG'));
      
      if (pgMaterial) {
        newBomItems.push({
          id: pgMaterial.id,
          name: pgMaterial.name,
          code: pgMaterial.code,
          type: 'material',
          unit: pgMaterial.unit,
          ratio: selectedFragrance.pgRatio,
          requiredQuantity: pgQuantity,
          currentStock: pgMaterial.currentStock,
          isCalculated: true,
        });
      }
    }

    // 3. VG (甘油)
    if (selectedFragrance.vgRatio) {
      const vgQuantity = (targetQuantity * selectedFragrance.vgRatio) / 100;
      const vgMaterial = materials.find(m => m.name.includes('VG甘油') || m.code.includes('VG'));
      
      if (vgMaterial) {
        newBomItems.push({
          id: vgMaterial.id,
          name: vgMaterial.name,
          code: vgMaterial.code,
          type: 'material',
          unit: vgMaterial.unit,
          ratio: selectedFragrance.vgRatio,
          requiredQuantity: vgQuantity,
          currentStock: vgMaterial.currentStock,
          isCalculated: true,
        });
      }
    }

    // 4. 尼古丁 (丁鹽)
    if (selectedProduct.nicotineMg) {
      const nicotineQuantity = (targetQuantity * selectedProduct.nicotineMg) / 250;
      const nicotineMaterial = materials.find(m => 
        m.name.includes('NicSalt丁鹽250mg') || 
        m.name.includes('丁鹽') || 
        m.code.includes('NIC')
      );
      
      if (nicotineMaterial) {
        newBomItems.push({
          id: nicotineMaterial.id,
          name: nicotineMaterial.name,
          code: nicotineMaterial.code,
          type: 'material',
          unit: nicotineMaterial.unit,
          ratio: selectedProduct.nicotineMg,
          requiredQuantity: nicotineQuantity,
          currentStock: nicotineMaterial.currentStock,
          isCalculated: true,
        });
      }
    }

    // 5. 其他物料 (預設為0，可手動編輯)
    materials.forEach(material => {
      if (!newBomItems.find(item => item.id === material.id)) {
        newBomItems.push({
          id: material.id,
          name: material.name,
          code: material.code,
          type: 'material',
          unit: material.unit,
          ratio: 0,
          requiredQuantity: 0,
          currentStock: material.currentStock,
          isCalculated: false,
        });
      }
    });

    setBomItems(newBomItems);
  }, [selectedProductId, targetQuantity, products, fragrances, materials]);

  // 當產品或目標產量改變時重新計算
  useEffect(() => {
    calculateRecipe();
  }, [calculateRecipe]);

  // 當對話框打開時載入資料
  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialProductId) {
        setSelectedProductId(initialProductId);
      }
    }
  }, [isOpen, loadData, initialProductId]);

  // 更新BOM項目數量
  const updateBomItemQuantity = (itemId: string, quantity: number) => {
    setBomItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, requiredQuantity: Math.max(0, quantity) }
        : item
    ));
  };

  // 建立工單
  const createWorkOrder = async () => {
    if (!selectedProductId || targetQuantity <= 0) {
      toast.error("請選擇產品並輸入有效的目標產量");
      return;
    }

    setIsCreating(true);
    try {
      const functions = getFunctions();
      const createWorkOrderFunction = httpsCallable(functions, 'createWorkOrder');

      const selectedProduct = products.find(p => p.id === selectedProductId);
      const selectedFragrance = fragrances.find(f => f.code === selectedProduct?.fragranceCode);

      const payload = {
        productId: selectedProductId,
        targetQuantity,
        fragranceId: selectedFragrance?.id,
        nicotineMg: selectedProduct?.nicotineMg,
        bomItems: bomItems.filter(item => item.requiredQuantity > 0).map(item => ({
          materialId: item.id,
          materialType: item.type,
          requiredQuantity: item.requiredQuantity,
          unit: item.unit,
        })),
      };

      await createWorkOrderFunction(payload);
      
      toast.success("工單建立成功");
      onWorkOrderCreated();
      onOpenChange(false);
      
      // 重置表單
      setSelectedProductId('');
      setTargetQuantity(1);
      setBomItems([]);
      
    } catch (error) {
      console.error("建立工單失敗:", error);
      toast.error("建立工單失敗");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedFragrance = fragrances.find(f => f.code === selectedProduct?.fragranceCode);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            配方計算機
          </DialogTitle>
          <DialogDescription>
            選擇產品並輸入目標產量，系統將自動計算所需配方和物料
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">載入資料中...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 產品選擇和目標產量 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">生產參數設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">選擇產品</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="請選擇產品" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="targetQuantity">目標產量 (KG)</Label>
                    <Input
                      id="targetQuantity"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="輸入目標產量"
                    />
                  </div>
                </div>

                {selectedProduct && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
                    <div>
                      <div className="text-sm text-gray-600">產品名稱</div>
                      <div className="font-medium">{selectedProduct.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">產品系列</div>
                      <div className="font-medium">{selectedProduct.seriesName || '未指定'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">尼古丁濃度</div>
                      <div className="font-medium">{selectedProduct.nicotineMg || 0} mg</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 配方資訊 */}
            {selectedFragrance && (
              <Card className="bg-pink-50 border-pink-200">
                <CardHeader>
                  <CardTitle className="text-pink-800 flex items-center gap-2">
                    <Droplets className="h-5 w-5" />
                    配方資訊
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-sm text-gray-600">香精比例</div>
                      <div className="text-lg font-bold text-pink-600">
                        {selectedFragrance.percentage || 0}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-sm text-gray-600">PG比例</div>
                      <div className="text-lg font-bold text-blue-600">
                        {selectedFragrance.pgRatio || 0}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-sm text-gray-600">VG比例</div>
                      <div className="text-lg font-bold text-green-600">
                        {selectedFragrance.vgRatio || 0}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-sm text-gray-600">總比例</div>
                      <div className="text-lg font-bold text-purple-600">
                        {((selectedFragrance.percentage || 0) + (selectedFragrance.pgRatio || 0) + (selectedFragrance.vgRatio || 0)).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BOM表 */}
            {bomItems.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    物料需求清單 (BOM表)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>物料名稱</TableHead>
                          <TableHead>代號</TableHead>
                          <TableHead>類型</TableHead>
                          <TableHead>比例</TableHead>
                          <TableHead>需求數量</TableHead>
                          <TableHead>單位</TableHead>
                          <TableHead>目前庫存</TableHead>
                          <TableHead>狀態</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bomItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.code}</TableCell>
                            <TableCell>
                              <Badge variant={item.type === 'fragrance' ? 'default' : 'secondary'}>
                                {item.type === 'fragrance' ? '香精' : '物料'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.isCalculated ? `${item.ratio}%` : '-'}
                            </TableCell>
                            <TableCell>
                              {item.isCalculated ? (
                                <span className="font-medium">{item.requiredQuantity.toFixed(3)}</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.requiredQuantity}
                                  onChange={(e) => updateBomItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                                  className="w-20"
                                />
                              )}
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.currentStock}</TableCell>
                            <TableCell>
                              {item.requiredQuantity > item.currentStock ? (
                                <Badge variant="destructive" className="text-xs">
                                  庫存不足
                                </Badge>
                              ) : (
                                <Badge variant="default" className="text-xs">
                                  庫存充足
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                取消
              </Button>
              <Button
                onClick={createWorkOrder}
                disabled={!selectedProductId || targetQuantity <= 0 || isCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    建立中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    建立工單
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
