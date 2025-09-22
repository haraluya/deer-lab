'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiClient } from '@/hooks/useApiClient';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { FlaskConical, Package, AlertTriangle, ShoppingCart, X, Calculator } from 'lucide-react';

// 香精試算項目介面
interface FragranceCalculationItem {
  productId: string;
  productName: string;
  productCode: string;
  seriesName: string;
  fragranceId: string;
  fragranceName: string;
  fragranceCode: string;
  fragranceRatio: number; // 香精比例 (%)
  targetQuantity: number; // 目標產量
  requiredFragrance: number; // 所需香精量
  currentStock: number; // 目前香精庫存
  fragranceUnit: string; // 香精單位
  costPerUnit: number; // 香精單價
  supplierId: string; // 供應商ID
  supplierName: string; // 供應商名稱
}

interface FragranceCalculatorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedProductIds: Set<string>;
  products: any[]; // 產品列表
  onProductSelectionChange: (productId: string, checked: boolean) => void; // 新增：產品選擇變更回調
}

export function FragranceCalculatorDialog({
  isOpen,
  onOpenChange,
  selectedProductIds,
  products,
  onProductSelectionChange
}: FragranceCalculatorDialogProps) {
  const [calculationItems, setCalculationItems] = useState<FragranceCalculationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 本地產品選擇狀態
  const [localSelectedProducts, setLocalSelectedProducts] = useState<Set<string>>(new Set());

  // API 客戶端
  const apiClient = useApiClient();

  // 當對話框開啟時載入資料並初始化本地選擇狀態
  useEffect(() => {
    if (isOpen && selectedProductIds.size > 0) {
      setLocalSelectedProducts(new Set(selectedProductIds));
      loadCalculationData();
    }
  }, [isOpen]); // 只依賴 isOpen，不依賴 selectedProductIds

  // 移除過濾邏輯，讓所有載入的計算項目保持顯示

  const loadCalculationData = async () => {
    setIsLoading(true);
    try {
      // 檢查 Firebase 初始化
      if (!db) {
        throw new Error('Firebase 未初始化');
      }

      // 檢查選擇的產品數量
      if (selectedProductIds.size > 10) {
        toast.error('最多只能選擇 10 個產品進行香精試算');
        onOpenChange(false);
        return;
      }

      const items: FragranceCalculationItem[] = [];
      
      console.log('開始載入香精試算資料...');
      console.log('選擇的產品ID:', Array.from(selectedProductIds));
      console.log('產品清單:', products);
      
      // 獲取香精庫存資料
      const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'));
      const fragrancesMap = new Map();
      fragrancesSnapshot.forEach(doc => {
        const data = doc.data();
        fragrancesMap.set(doc.id, {
          name: data.name,
          code: data.code,
          currentStock: data.currentStock || 0,
          unit: data.unit || 'ml',
          costPerUnit: data.costPerUnit || 0,
          supplierId: data.supplierId || 'default',
          supplierName: data.supplierName || '未指定供應商',
          percentage: data.percentage || 10 // 從香精資料中讀取比例
        });
      });

      console.log('香精資料:', fragrancesMap);

      // 處理每個選中的產品
      for (const productId of Array.from(selectedProductIds)) {
        const product = products.find(p => p.id === productId);
        if (!product) {
          console.log(`找不到產品: ${productId}`);
          continue;
        }

        console.log(`處理產品: ${product.name}`, product);

        // 獲取產品的香精參考
        let fragranceInfo = null;
        let fragranceId = null;

        // 檢查產品是否有香精參考
        if (product.currentFragranceRef?.id) {
          fragranceId = product.currentFragranceRef.id;
          fragranceInfo = fragrancesMap.get(fragranceId);
          console.log(`產品 ${product.name} 使用香精ID: ${fragranceId}`);
        } else {
          console.log(`產品 ${product.name} 沒有配置香精參考`);
          // 如果沒有香精參考，跳過這個產品
          continue;
        }

        if (fragranceInfo) {
          const fragranceRatio = fragranceInfo.percentage; // 直接從香精資料中獲取比例
          console.log(`香精 ${fragranceInfo.name} 比例: ${fragranceRatio}%`);
          
          items.push({
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            seriesName: product.seriesName || '未知系列',
            fragranceId: fragranceId,
            fragranceName: fragranceInfo.name,
            fragranceCode: fragranceInfo.code,
            fragranceRatio: fragranceRatio,
            targetQuantity: 1, // 預設目標產量為 1
            requiredFragrance: Math.round((fragranceRatio / 100) * 1000) / 1000, // 計算所需香精量 (進位到小數點第三位)
            currentStock: fragranceInfo.currentStock,
            fragranceUnit: fragranceInfo.unit,
            costPerUnit: fragranceInfo.costPerUnit,
            supplierId: fragranceInfo.supplierId,
            supplierName: fragranceInfo.supplierName
          });
        } else {
          console.log(`找不到香精資訊: ${fragranceId}`);
        }
      }

      console.log('處理完成，總計項目數:', items.length);
      console.log('試算項目:', items);

      // 直接設置所有計算項目，不進行過濾
      // 過濾邏輯已由 useEffect 處理
      setCalculationItems(items);
    } catch (error) {
      console.error('載入香精試算資料失敗:', error);
      toast.error('載入香精試算資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 處理產品勾選狀態變更
  const handleProductSelectionChange = (productId: string, checked: boolean) => {
    // 更新本地選擇狀態
    const newLocalSelected = new Set(localSelectedProducts);
    if (checked) {
      newLocalSelected.add(productId);
    } else {
      newLocalSelected.delete(productId);
    }
    setLocalSelectedProducts(newLocalSelected);

    // 通知父組件更新選擇狀態
    onProductSelectionChange(productId, checked);

    // 不移除計算項目，保留用戶輸入的目標產量
    // 只在顯示和計算時根據 localSelectedProducts 進行過濾
  };

  // 更新目標產量
  const updateTargetQuantity = (productId: string, quantity: number) => {
    setCalculationItems(prev => 
      prev.map(item => 
        item.productId === productId 
          ? { 
              ...item, 
              targetQuantity: quantity,
              requiredFragrance: Math.round((quantity * item.fragranceRatio / 100) * 1000) / 1000
            }
          : item
      )
    );
  };

  // 計算總需求（只計算已選擇的產品）
  const totalRequirements = useMemo(() => {
    const fragranceMap = new Map<string, {
      name: string;
      code: string;
      unit: string;
      totalRequired: number;
      currentStock: number;
      costPerUnit: number;
      supplierId: string;
      supplierName: string;
    }>();

    // 只計算已選擇的產品
    calculationItems
      .filter(item => localSelectedProducts.has(item.productId))
      .forEach(item => {
        const key = item.fragranceId;
        if (fragranceMap.has(key)) {
          const existing = fragranceMap.get(key)!;
          existing.totalRequired = Math.round((existing.totalRequired + item.requiredFragrance) * 1000) / 1000;
        } else {
          fragranceMap.set(key, {
            name: item.fragranceName,
            code: item.fragranceCode,
            unit: item.fragranceUnit,
            totalRequired: item.requiredFragrance,
            currentStock: item.currentStock,
            costPerUnit: item.costPerUnit,
            supplierId: item.supplierId,
            supplierName: item.supplierName
          });
        }
      });

    return Array.from(fragranceMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      shortage: Math.max(0, data.totalRequired - data.currentStock)
    }));
  }, [calculationItems, localSelectedProducts]);

  // 加入採購車 - 極簡引用模式
  const handleAddToCart = async () => {
    if (totalRequirements.length === 0) {
      toast.error('沒有需要加入採購車的香精');
      return;
    }

    try {
      // 🚀 使用批量API，極簡資料傳送
      const batchItems = totalRequirements.map(item => ({
        type: 'fragrance' as const,
        code: item.code,
        quantity: item.totalRequired
      }));

      const result = await apiClient.call('batchAddToGlobalCart', {
        items: batchItems
      });

      if (!result.success) {
        throw new Error(result.error?.message || '加入購物車失敗');
      }

      toast.success(`已將 ${totalRequirements.length} 項香精加入採購車`);
      onOpenChange(false);
    } catch (error) {
      console.error('加入採購車失敗:', error);
      toast.error('加入採購車失敗');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                香精試算
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                計算選定產品的香精需求量，並評估庫存狀況
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
              </div>
              <span className="mt-4 text-gray-600 font-medium">載入香精試算資料...</span>
            </div>
          ) : calculationItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">無法載入香精資訊</h3>
              <p className="text-gray-600 text-center">
                選定的產品可能沒有配置香精資訊，<br />
                請檢查產品設定或選擇其他產品。
              </p>
            </div>
          ) : (
            <>
              {/* 產品卡片列表 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  選定產品 ({calculationItems.filter(item => localSelectedProducts.has(item.productId)).length} 項)
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  {calculationItems
                    .filter(item => localSelectedProducts.has(item.productId))
                    .map((item) => (
                    <Card key={item.productId} className="border border-purple-100 hover:border-purple-200 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-gray-900">
                              {item.productName}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                {item.productCode}
                              </Badge>
                              <span className="text-xs text-gray-500">{item.seriesName}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 ml-3">
                            <Checkbox
                              checked={localSelectedProducts.has(item.productId)}
                              onCheckedChange={(checked) => 
                                handleProductSelectionChange(item.productId, checked as boolean)
                              }
                              className="mt-1 border-2 border-gray-800 data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">使用香精</Label>
                            <div className="font-medium text-purple-600">
                              {item.fragranceCode}
                            </div>
                            <div className="text-xs text-gray-500">{item.fragranceName}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">香精比例</Label>
                            <div className="font-medium text-indigo-600">
                              {item.fragranceRatio}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`quantity-${item.productId}`} className="text-xs text-gray-500">
                              目標產量
                            </Label>
                            <Input
                              id={`quantity-${item.productId}`}
                              type="number"
                              min="1"
                              step="1"
                              value={item.targetQuantity}
                              onChange={(e) => updateTargetQuantity(item.productId, Number(e.target.value) || 1)}
                              className="h-9 text-sm border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                              inputMode="numeric"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">所需香精</Label>
                            <div className="h-9 px-3 bg-purple-50 border border-purple-200 rounded-md flex items-center text-sm font-medium text-purple-700">
                              {item.requiredFragrance.toFixed(3)} {item.fragranceUnit}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-500">目前庫存</Label>
                          <div className={`text-sm font-medium ${
                            item.currentStock >= item.requiredFragrance 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {item.currentStock} {item.fragranceUnit}
                            {item.currentStock < item.requiredFragrance && (
                              <span className="ml-2 text-xs">
                                (缺少 {(item.requiredFragrance - item.currentStock).toFixed(3)} {item.fragranceUnit})
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className="bg-purple-100" />

              {/* 香精需求匯總 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-indigo-600" />
                  香精需求匯總
                </h3>
                
                <div className="space-y-3">
                  {totalRequirements.map((fragrance) => (
                    <Card key={fragrance.id} className={`border transition-colors ${
                      fragrance.shortage > 0 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-green-200 bg-green-50'
                    }`}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {fragrance.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {fragrance.code}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">需求：</span>
                                <span className="font-medium text-indigo-600">
                                  {fragrance.totalRequired.toFixed(3)} {fragrance.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">庫存：</span>
                                <span className="font-medium text-gray-700">
                                  {fragrance.currentStock} {fragrance.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">狀態：</span>
                                <span className={`font-medium ${
                                  fragrance.shortage > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {fragrance.shortage > 0 
                                    ? `缺少 ${fragrance.shortage.toFixed(3)} ${fragrance.unit}` 
                                    : '庫存充足'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-100">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button 
            onClick={handleAddToCart}
            disabled={totalRequirements.length === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            加入採購車
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}