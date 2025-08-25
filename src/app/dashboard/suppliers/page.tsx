// src/app/dashboard/suppliers/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { SupplierDialog, SupplierData } from './SupplierDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, Eye, Edit, Building, Package, Phone, Plus, User } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// 供應商資料介面（包含對接人員資訊）
interface SupplierWithLiaison extends SupplierData {
  liaisonPersonName?: string;
  liaisonPersonPhone?: string;
}

function SuppliersPageContent() {
  const [suppliers, setSuppliers] = useState<SupplierWithLiaison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedDetailSupplier, setSelectedDetailSupplier] = useState<SupplierWithLiaison | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const suppliersCollectionRef = collection(db, 'suppliers');
      const suppliersSnapshot = await getDocs(suppliersCollectionRef);
      
      console.log('原始供應商資料:', suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); // 調試日誌
      
      // 獲取供應商資料並包含對接人員資訊
      const suppliersList = await Promise.all(
        suppliersSnapshot.docs.map(async (doc: QueryDocumentSnapshot<DocumentData>) => {
          const supplierData = doc.data() as SupplierData;
          let liaisonPersonName = '';
          let liaisonPersonPhone = '';
          
          // 如果有對接人員ID，獲取對接人員資訊
          if (supplierData.liaisonPersonId && db) {
            try {
              const liaisonDoc = await getDoc(firestoreDoc(db, 'users', supplierData.liaisonPersonId));
              if (liaisonDoc.exists()) {
                const liaisonData = liaisonDoc.data();
                liaisonPersonName = liaisonData.name || '';
                liaisonPersonPhone = liaisonData.phone || '';
              }
            } catch (error) {
              console.error('獲取對接人員資訊失敗:', error);
            }
          }
          
          const result = {
            ...supplierData,
            id: doc.id,
            liaisonPersonName,
            liaisonPersonPhone,
          } as SupplierWithLiaison;
          
          console.log('處理後的供應商資料:', result); // 調試日誌
          return result;
        })
      );
      
      console.log('最終供應商列表:', suppliersList); // 調試日誌
      setSuppliers(suppliersList);
    } catch (error) {
      console.error("讀取供應商資料失敗:", error);
      toast.error("讀取供應商資料失敗，請檢查網路連線或聯絡管理員。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (supplier: SupplierData) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: SupplierData) => {
    setSelectedSupplier(supplier);
    setIsConfirmOpen(true);
  };

  const handleViewDetail = (supplier: SupplierWithLiaison) => {
    setSelectedDetailSupplier(supplier);
    setIsDetailViewOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSupplier) return;

    const toastId = toast.loading("正在刪除供應商...");
    try {
      const functions = getFunctions();
      const deleteSupplier = httpsCallable(functions, 'deleteSupplier');
      await deleteSupplier({ supplierId: selectedSupplier.id });

      toast.success(`供應商 ${selectedSupplier.name} 已成功刪除。`, { id: toastId });
      fetchSuppliers(); // Refresh the list
    } catch (error) {
      console.error("刪除供應商失敗:", error);
      let errorMessage = "刪除供應商時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedSupplier(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            供應商管理
          </h1>
          <p className="text-gray-600 mt-2">管理合作供應商與聯絡資訊</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <Button 
          onClick={handleAdd}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增供應商
        </Button>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex justify-end">
          <Button 
            onClick={handleAdd}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增供應商
          </Button>
        </div>
      </div>

      {/* 手機版卡片容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-800">供應商清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {suppliers.length} 個
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : suppliers.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <div 
                      key={supplier.id} 
                      className="p-4 hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleViewDetail(supplier)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Building className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{supplier.name}</div>
                            <div className="text-xs text-gray-500">供應商</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(supplier)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              編輯供應商
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(supplier)} className="text-red-600">
                              刪除供應商
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Package className="h-3 w-3 text-blue-600" />
                            <span className="text-gray-500">供應商品</span>
                          </div>
                          <span className="font-medium text-gray-700">{supplier.products || '未提供'}</span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <User className="h-3 w-3 text-green-600" />
                            <span className="text-gray-500">聯絡窗口</span>
                          </div>
                          <span className="font-medium text-gray-700">
                            {supplier.contactWindow || '未指定'}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Phone className="h-3 w-3 text-purple-600" />
                            <span className="text-gray-500">聯絡方式</span>
                          </div>
                          <span className="font-medium text-gray-700">{supplier.contactMethod || '未提供'}</span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <User className="h-3 w-3 text-orange-600" />
                            <span className="text-gray-500">對接人員</span>
                          </div>
                          <span className="font-medium text-gray-700">
                            {supplier.liaisonPersonName || '未指定'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Building className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有供應商資料</h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">開始建立第一個供應商來管理合作關係</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增供應商
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面版卡片容器 */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))
          ) : suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <div 
                key={supplier.id}
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                onClick={() => handleViewDetail(supplier)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors duration-200">
                        {supplier.name}
                      </h3>
                      <p className="text-sm text-gray-500">供應商</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewDetail(supplier)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看詳細
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4 mr-2" />
                        編輯供應商
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(supplier)}
                        className="text-red-600 focus:text-red-600"
                      >
                        刪除供應商
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">供應商品</p>
                      <p className="text-sm font-medium text-gray-900">{supplier.products || '未提供'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">聯絡窗口</p>
                      <p className="text-sm font-medium text-gray-900">
                        {supplier.contactWindow || '未指定'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">聯絡方式</p>
                      <p className="text-sm font-medium text-gray-900">{supplier.contactMethod || '未提供'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-500">對接人員</p>
                      <p className="text-sm font-medium text-gray-900">
                        {supplier.liaisonPersonName || '未指定'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">點擊查看詳情</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">沒有供應商資料</h3>
              <p className="text-gray-500 mb-4">開始建立第一個供應商來管理合作關係</p>
              <Button 
                onClick={handleAdd}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增供應商
              </Button>
            </div>
          )}
        </div>
      </div>

      <SupplierDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSupplierUpdate={fetchSuppliers}
        supplierData={selectedSupplier}
      />

      {selectedSupplier && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除供應商`}
          description={`您確定要永久刪除供應商「${selectedSupplier.name}」嗎？此操作無法復原。`}
        />
      )}

      {/* 供應商詳細資料對話框 */}
      {selectedDetailSupplier && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                {selectedDetailSupplier.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">供應商詳細資訊</p>
            </DialogHeader>

            <div className="space-y-6">
              {/* 基本資訊 */}
              <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                  <Building className="h-4 w-4" />
                  基本資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">供應商名稱</label>
                    <div className="text-sm text-gray-900">{selectedDetailSupplier.name || '-'}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">供應商品</label>
                    <div className="text-sm text-gray-900">{selectedDetailSupplier.products || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 聯絡資訊 */}
              <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-green-800">
                  <User className="h-4 w-4" />
                  聯絡資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">聯絡窗口</label>
                    <div className="text-sm text-gray-900">{selectedDetailSupplier.contactWindow || '未指定'}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">聯絡方式</label>
                    <div className="text-sm text-gray-900">{selectedDetailSupplier.contactMethod || '-'}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">對接人員</label>
                    <div className="text-sm text-gray-900">{selectedDetailSupplier.liaisonPersonName || '未指定'}</div>
                  </div>
                </div>
              </div>

              {/* 詳細內容 */}
              {selectedDetailSupplier.notes && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-800">
                    <Package className="h-4 w-4" />
                    詳細內容
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">備註資料</label>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border">
                      {selectedDetailSupplier.notes}
                    </div>
                  </div>
                </div>
              )}

              {/* 備註框 */}
              <div className="space-y-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-yellow-800">
                  <Package className="h-4 w-4" />
                  備註
                </h3>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600">新增備註</label>
                  <Textarea 
                    placeholder="請輸入額外的備註資訊..." 
                    className="min-h-[100px] resize-none"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDetailViewOpen(false)}>
                關閉
              </Button>
              <Button 
                onClick={() => {
                  setIsDetailViewOpen(false);
                  handleEdit(selectedDetailSupplier);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <SuppliersPageContent />
  );
}
