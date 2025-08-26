// src/app/dashboard/material-categories/CategoryDetailDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Tag, Package, Building, Calendar, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

// 物料資料介面
interface MaterialData {
  id: string;
  code: string;
  name: string;
  category: string;
  subCategory: string;
  currentStock: number;
  unit: string;
  supplierName?: string;
  supplierRef?: any; // 添加 supplierRef 屬性
  createdAt?: any;
}

interface CategoryDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: {
    id: string;
    name: string;
    type: "category" | "subCategory";
    usageCount: number;
  } | null;
  onEdit?: (category: {
    id: string;
    name: string;
    type: "category" | "subCategory";
    usageCount: number;
  }) => void;
}

export function CategoryDetailDialog({
  isOpen,
  onOpenChange,
  category,
  onEdit,
}: CategoryDetailDialogProps) {
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 載入使用該分類的物料
  useEffect(() => {
    const loadMaterials = async () => {
      if (!isOpen || !category || !db) return;

      setIsLoading(true);
      try {
        const materialsRef = collection(db, 'materials');
        let materialsQuery;

        if (category.type === 'category') {
          // 查詢主分類
          materialsQuery = query(materialsRef, where('category', '==', category.name));
        } else {
          // 查詢細分分類
          materialsQuery = query(materialsRef, where('subCategory', '==', category.name));
        }

        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaterialData[];

        // 獲取供應商名稱
        const materialsWithSupplier = await Promise.all(
          materialsList.map(async (material) => {
            if (material.supplierRef && db) {
              try {
                const supplierDoc = await getDocs(query(collection(db, 'suppliers'), where('__name__', '==', material.supplierRef.id)));
                if (!supplierDoc.empty) {
                  material.supplierName = supplierDoc.docs[0].data().name;
                }
              } catch (error) {
                console.error('獲取供應商名稱失敗:', error);
                material.supplierName = '讀取失敗';
              }
            }
            return material;
          })
        );

        setMaterials(materialsWithSupplier);
      } catch (error) {
        console.error('載入物料資料失敗:', error);
        toast.error('載入物料資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    loadMaterials();
  }, [isOpen, category]);

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Tag className="h-5 w-5 text-white" />
            </div>
            分類詳情
          </DialogTitle>
          <p className="text-gray-600 mt-2">
            {category.type === 'category' ? '主分類' : '細分分類'}，共 {category.usageCount} 個物料使用此分類
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* 分類資訊 */}
          <div className="space-y-6 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-3 text-teal-800">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <Tag className="h-4 w-4 text-teal-600" />
              </div>
              分類資訊
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">分類名稱</label>
                <div className="text-lg font-medium text-gray-900">{category.name}</div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">分類類型</label>
                <div className="text-lg">
                  <Badge className={`${category.type === 'category' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'}`}>
                    {category.type === 'category' ? '主分類' : '細分分類'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">使用數量</label>
                <div className="text-lg font-medium text-gray-900">{category.usageCount} 個物料</div>
              </div>
            </div>
          </div>

          {/* 物料列表 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <Package className="h-4 w-4" />
              使用此分類的物料
            </h3>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-teal-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-teal-600 rounded-full animate-spin"></div>
                </div>
                <span className="mt-3 text-sm text-gray-600 font-medium">載入物料資料中...</span>
              </div>
            ) : materials.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料資訊</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>供應商</TableHead>
                      <TableHead>庫存</TableHead>
                      <TableHead>單位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id} className="hover:bg-teal-50/50 transition-colors duration-200">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                              <Package className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{material.name}</div>
                              <div className="text-xs text-gray-500">代號: {material.code}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {material.category && (
                              <div className="text-xs">
                                <span className="text-gray-500">主分類:</span> {material.category}
                              </div>
                            )}
                            {material.subCategory && (
                              <div className="text-xs">
                                <span className="text-gray-500">細分類:</span> {material.subCategory}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {material.supplierName || '未指定'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              material.currentStock > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {material.currentStock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{material.unit || '-'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">沒有使用此分類的物料</h3>
                <p className="text-sm text-gray-500 text-center">
                  目前沒有物料使用「{category.name}」分類
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            關閉
          </Button>
          {onEdit && category && (
            <Button 
              onClick={() => {
                onEdit(category);
                onOpenChange(false);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Edit className="mr-2 h-4 w-4" />
              編輯分類
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
