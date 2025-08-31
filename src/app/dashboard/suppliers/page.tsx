// src/app/dashboard/suppliers/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, doc as firestoreDoc, getDoc, query, where, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { SupplierDialog, SupplierData } from './SupplierDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, Eye, Edit, Building, Package, Phone, Plus, User, Search, Droplets } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// 供應商資料介面（包含對接人員資訊）
interface SupplierWithLiaison extends SupplierData {
  liaisonPersonName?: string;
  liaisonPersonPhone?: string;
}

function SuppliersPageContent() {
  const [suppliers, setSuppliers] = useState<SupplierWithLiaison[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<SupplierWithLiaison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedDetailSupplier, setSelectedDetailSupplier] = useState<SupplierWithLiaison | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      setFilteredSuppliers(suppliersList);
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

  // 搜尋功能
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.products?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactWindow?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.liaisonPersonName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

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
    <div className="container mx-auto py-6 suppliers-page">
      {/* 頁面標題和操作區域 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            供應商管理
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">管理合作供應商與聯絡資訊</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增供應商
        </Button>
      </div>

      {/* 搜尋欄 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜尋供應商名稱、供應商品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-500 mt-2">
            找到 {filteredSuppliers.length} 個符合條件的供應商
          </p>
        )}
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* 手機版表格標題 */}
        <div className="lg:hidden px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-800">供應商清單</h2>
            </div>
            <div className="text-xs text-gray-600">
              共 {filteredSuppliers.length} 個
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
          </div>
        ) : filteredSuppliers.length > 0 ? (
          <>
            {/* 桌面版表格 */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-700">供應商名稱</TableHead>
                    <TableHead className="font-semibold text-gray-700">供應商品</TableHead>
                    <TableHead className="font-semibold text-gray-700">聯絡窗口</TableHead>
                    <TableHead className="font-semibold text-gray-700">聯絡方式</TableHead>
                    <TableHead className="font-semibold text-gray-700">對接人員</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow 
                      key={supplier.id} 
                      className="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleViewDetail(supplier)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Building className="h-4 w-4 text-white" />
                          </div>
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.products || '-'}</TableCell>
                      <TableCell>{supplier.contactWindow || '未指定'}</TableCell>
                      <TableCell>{supplier.contactMethod || '-'}</TableCell>
                      <TableCell>{supplier.liaisonPersonName || '未指定'}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
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
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(supplier);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              編輯
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(supplier)}
                              className="text-red-600 focus:text-red-600"
                            >
                              刪除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 手機版列表 */}
            <div className="lg:hidden divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
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
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(supplier)} className="text-red-600">
                          刪除
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? '找不到符合條件的供應商' : '沒有供應商資料'}
            </h3>
            <p className="text-gray-500 mb-4 text-center">
              {searchTerm ? '請嘗試不同的搜尋條件' : '開始建立第一個供應商來管理合作關係'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={handleAdd}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增供應商
              </Button>
            )}
          </div>
        )}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="pb-4 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building className="h-5 w-5 text-white" />
                </div>
                供應商詳情
              </DialogTitle>
              <p className="text-gray-600 mt-2">供應商詳細資訊</p>
            </DialogHeader>

            <div className="space-y-6">
              {/* 基本資訊 */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="text-xl font-bold flex items-center gap-3 text-blue-800">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="h-4 w-4 text-blue-600" />
                  </div>
                  基本資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">供應商名稱</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailSupplier.name || '-'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">供應商品</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailSupplier.products || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 聯絡資訊 */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
                <h3 className="text-xl font-bold flex items-center gap-3 text-green-800">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  聯絡資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">聯絡窗口</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailSupplier.contactWindow || '未指定'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">聯絡方式</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailSupplier.contactMethod || '-'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">對接人員</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailSupplier.liaisonPersonName || '未指定'}</div>
                  </div>
                </div>
              </div>

              {/* 詳細內容 */}
              {selectedDetailSupplier.notes && (
                <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
                  <h3 className="text-xl font-bold flex items-center gap-3 text-purple-800">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-purple-600" />
                    </div>
                    詳細內容
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">備註資料</label>
                    <div className="text-lg font-medium text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {selectedDetailSupplier.notes}
                    </div>
                  </div>
                </div>
              )}

              {/* 相關物料和香精 */}
              <SupplierRelatedItems supplierId={selectedDetailSupplier.id} />
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailViewOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                關閉
              </Button>
              <Button 
                onClick={() => {
                  setIsDetailViewOpen(false);
                  setTimeout(() => {
                    handleEdit(selectedDetailSupplier);
                  }, 100);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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

// 供應商相關物料和香精組件
interface SupplierRelatedItemsProps {
  supplierId: string;
}

function SupplierRelatedItems({ supplierId }: SupplierRelatedItemsProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [fragrances, setFragrances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedItems = async () => {
      setIsLoading(true);
      try {
        if (!db) {
          throw new Error("Firebase 未初始化");
        }

        // 獲取相關物料
        const materialsRef = collection(db, 'materials');
        const materialsQuery = query(materialsRef, where('supplierRef', '==', doc(db, 'suppliers', supplierId)));
        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));

        // 獲取相關香精
        const fragrancesRef = collection(db, 'fragrances');
        const fragrancesQuery = query(fragrancesRef, where('supplierRef', '==', doc(db, 'suppliers', supplierId)));
        const fragrancesSnapshot = await getDocs(fragrancesQuery);
        const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));

        // 按名稱排序物料和香精
        const sortedMaterials = materialsList.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
        const sortedFragrances = fragrancesList.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));

        setMaterials(sortedMaterials);
        setFragrances(sortedFragrances);
      } catch (error) {
        console.error('獲取相關物料和香精失敗:', error);
        toast.error('獲取相關物料和香精失敗');
      } finally {
        setIsLoading(false);
      }
    };

    if (supplierId) {
      fetchRelatedItems();
    }
  }, [supplierId]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm">
        <h3 className="text-xl font-bold flex items-center gap-3 text-orange-800">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Package className="h-4 w-4 text-orange-600" />
          </div>
          相關物料和香精
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-orange-600">載入中...</span>
        </div>
      </div>
    );
  }

  const hasItems = materials.length > 0 || fragrances.length > 0;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm">
      <h3 className="text-xl font-bold flex items-center gap-3 text-orange-800">
        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <Package className="h-4 w-4 text-orange-600" />
        </div>
        相關物料和香精
      </h3>
      
      {!hasItems ? (
        <div className="text-center py-8 text-orange-600">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>目前沒有相關的物料或香精</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 相關物料 */}
          {materials.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                <Building className="h-4 w-4" />
                相關物料 ({materials.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {materials.map((material) => (
                  <div key={material.id} className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900">{material.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {material.code}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>分類: {material.category} / {material.subCategory}</div>
                      <div>庫存: {material.currentStock || 0} {material.unit}</div>
                      <div>成本: NT$ {material.costPerUnit || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 相關香精 */}
          {fragrances.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                相關香精 ({fragrances.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fragrances.map((fragrance) => (
                  <div key={fragrance.id} className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900">{fragrance.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {fragrance.code}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>種類: {fragrance.fragranceType || fragrance.status}</div>
                      <div>庫存: {fragrance.currentStock || 0} {fragrance.unit || 'KG'}</div>
                      <div>成本: NT$ {fragrance.costPerUnit || 0}</div>
                      {fragrance.percentage && (
                        <div>濃度: {fragrance.percentage}%</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <SuppliersPageContent />
  );
}