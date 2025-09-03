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
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  
  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewSuppliers = hasPermission('suppliers.view') || hasPermission('suppliers:view');
  const canManageSuppliers = hasPermission('suppliers.manage') || hasPermission('suppliers:manage') || hasPermission('suppliers:create') || hasPermission('suppliers:edit');
  
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

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewSuppliers && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看供應商管理頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* 頁面背景裝飾 */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="container mx-auto py-8 px-4 lg:px-8">
        {/* 頁面頂部區域 - 增強設計 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    供應商管理
                  </h1>
                  <p className="text-gray-600 mt-2 text-base lg:text-lg">統一管理合作供應商與聯絡資訊</p>
                </div>
              </div>
              
              {/* 統計資訊卡片 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700">{filteredSuppliers.length}</div>
                      <div className="text-xs text-blue-600 font-medium">供應商總數</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-700">
                        {filteredSuppliers.filter(s => s.liaisonPersonName).length}
                      </div>
                      <div className="text-xs text-emerald-600 font-medium">已指派對接人</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-700">
                        {new Set(filteredSuppliers.flatMap(s => s.products?.split(',') || [])).size}
                      </div>
                      <div className="text-xs text-purple-600 font-medium">產品類別</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-700">
                        {filteredSuppliers.filter(s => s.contactMethod).length}
                      </div>
                      <div className="text-xs text-orange-600 font-medium">已建立聯繫</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {canManageSuppliers && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleAdd}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl font-medium"
                  size="lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  新增供應商
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 搜尋區域 - 增強設計 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="搜尋供應商名稱、供應商品、聯絡窗口..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white/90 border-gray-200/80 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-base shadow-sm transition-all duration-200"
                />
              </div>
            </div>
            
            {searchTerm && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/80 rounded-lg border border-blue-200/50">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-blue-700 font-medium">
                  找到 {filteredSuppliers.length} 個符合條件的供應商
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 供應商列表容器 - 全新設計 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* 手機版頭部 */}
          <div className="lg:hidden px-6 py-4 bg-gradient-to-r from-slate-50/80 via-blue-50/80 to-indigo-50/80 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">供應商清單</h2>
                  <p className="text-xs text-slate-600">合作夥伴資訊</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{filteredSuppliers.length}</div>
                <div className="text-xs text-slate-500">供應商</div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-4">
                <div className="w-12 h-12 border-4 border-blue-200/50 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              </div>
              <span className="mt-3 text-base text-slate-600 font-medium">正在載入供應商資料...</span>
            </div>
        ) : filteredSuppliers.length > 0 ? (
          <>
            {/* 桌面版表格 - 全新設計 */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50/80 via-blue-50/80 to-indigo-50/80 border-b-2 border-slate-200/50">
                    <TableHead className="font-bold text-slate-700 text-sm py-4">供應商名稱</TableHead>
                    <TableHead className="font-bold text-slate-700 text-sm py-4">供應商品</TableHead>
                    <TableHead className="font-bold text-slate-700 text-sm py-4">聯絡窗口</TableHead>
                    <TableHead className="font-bold text-slate-700 text-sm py-4">聯絡方式</TableHead>
                    <TableHead className="font-bold text-slate-700 text-sm py-4">對接人員</TableHead>
                    <TableHead className="text-center font-bold text-slate-700 text-sm py-4">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier, index) => (
                    <TableRow 
                      key={supplier.id} 
                      className="hover:bg-gradient-to-r hover:from-blue-50/70 hover:via-indigo-50/50 hover:to-purple-50/30 transition-all duration-300 cursor-pointer border-b border-slate-100/50 group"
                      onClick={() => handleViewDetail(supplier)}
                    >
                      <TableCell className="font-medium py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                              <Building className="h-5 w-5 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-base">{supplier.name}</div>
                            <div className="text-xs text-slate-500 font-medium">ID: {supplier.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1">
                          {supplier.products ? (
                            supplier.products.split(',').slice(0, 2).map((product, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-medium">
                                {product.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-sm">未指定</span>
                          )}
                          {supplier.products && supplier.products.split(',').length > 2 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                              +{supplier.products.split(',').length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <User className="h-3 w-3 text-emerald-600" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {supplier.contactWindow || '未指定'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Phone className="h-3 w-3 text-purple-600" />
                          </div>
                          <span className="font-medium text-slate-700 text-sm">
                            {supplier.contactMethod || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                            <User className="h-3 w-3 text-orange-600" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {supplier.liaisonPersonName || '未指定'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              className="h-9 w-9 p-0 hover:bg-white/80 hover:shadow-md transition-all duration-200 rounded-lg"
                            >
                              <MoreHorizontal className="h-4 w-4 text-slate-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl rounded-xl">
                            <DropdownMenuLabel className="text-slate-700 font-semibold">操作選項</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleViewDetail(supplier)}
                              className="flex items-center gap-2 text-slate-700 hover:bg-blue-50/80 transition-colors rounded-lg"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                              查看詳細
                            </DropdownMenuItem>
                            {canManageSuppliers && (
                              <>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(supplier);
                                  }}
                                  className="flex items-center gap-2 text-slate-700 hover:bg-indigo-50/80 transition-colors rounded-lg"
                                >
                                  <Edit className="h-4 w-4 text-indigo-600" />
                                  編輯
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(supplier)}
                                  className="flex items-center gap-2 text-red-600 hover:bg-red-50/80 focus:text-red-700 transition-colors rounded-lg"
                                >
                                  刪除
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 手機版列表 - 全新卡片設計 */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className="group bg-gradient-to-br from-white/90 via-white/70 to-slate-50/50 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                  onClick={() => handleViewDetail(supplier)}
                >
                  {/* 卡片頭部 */}
                  <div className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 p-4 border-b border-slate-100/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <Building className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-base">{supplier.name}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            ID: {supplier.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0 hover:bg-white/60 hover:shadow-md transition-all duration-200 rounded-lg"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl rounded-xl">
                          <DropdownMenuItem 
                            onClick={() => handleViewDetail(supplier)}
                            className="flex items-center gap-2 text-slate-700 hover:bg-blue-50/80 transition-colors rounded-lg"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                            查看詳細
                          </DropdownMenuItem>
                          {canManageSuppliers && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleEdit(supplier)}
                                className="flex items-center gap-2 text-slate-700 hover:bg-indigo-50/80 transition-colors rounded-lg"
                              >
                                <Edit className="h-4 w-4 text-indigo-600" />
                                編輯
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(supplier)} 
                                className="flex items-center gap-2 text-red-600 hover:bg-red-50/80 transition-colors rounded-lg"
                              >
                                刪除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* 卡片內容 */}
                  <div className="p-4 space-y-4">
                    {/* 產品標籤 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">供應商品</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {supplier.products ? (
                          supplier.products.split(',').map((product, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-medium">
                              {product.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm italic">未提供</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 聯絡資訊網格 */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100/50">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">聯絡窗口</div>
                          <div className="font-bold text-slate-700">{supplier.contactWindow || '未指定'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-purple-50/60 rounded-xl border border-purple-100/50">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Phone className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">聯絡方式</div>
                          <div className="font-bold text-slate-700">{supplier.contactMethod || '未提供'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-orange-50/60 rounded-xl border border-orange-100/50">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">對接人員</div>
                          <div className="font-bold text-slate-700">{supplier.liaisonPersonName || '未指定'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center shadow-lg">
                  <Building className="h-12 w-12 text-slate-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
              
              <div className="text-center space-y-3 max-w-md">
                <h3 className="text-xl font-bold text-slate-800">
                  {searchTerm ? '找不到符合條件的供應商' : '尚未建立供應商資料'}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {searchTerm 
                    ? '請嘗試修改搜尋關鍵字，或清除篩選條件查看所有供應商' 
                    : '建立您的第一個供應商資料，開始管理合作夥伴關係與聯絡資訊'
                  }
                </p>
              </div>
              
              {!searchTerm && canManageSuppliers && (
                <div className="mt-8 space-y-3">
                  <Button 
                    onClick={handleAdd}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl font-medium"
                    size="lg"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    建立第一個供應商
                  </Button>
                  <p className="text-xs text-slate-500 text-center">開始建立您的供應商網絡</p>
                </div>
              )}
              
              {searchTerm && (
                <Button 
                  onClick={() => setSearchTerm('')}
                  variant="outline"
                  className="mt-6 border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  清除搜尋條件
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

        {/* 供應商詳細資料對話框 - 修正響應式設計 */}
        {selectedDetailSupplier && (
          <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 border-0 shadow-2xl backdrop-blur-sm p-0">
              <div className="flex flex-col h-full max-h-[90vh]">
                {/* 頭部區域 - 修正手機版排版 */}
                <DialogHeader className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-200/50 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Building className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 sm:border-3 border-white flex items-center justify-center">
                          <div className="w-1 h-1 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2 truncate">
                          {selectedDetailSupplier.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 text-sm sm:text-base">
                          供應商詳細資訊與合作關係管理
                        </DialogDescription>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-2 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-semibold">
                            ID: {selectedDetailSupplier.id.substring(0, 8)}
                          </span>
                          <span className="px-2 py-1 bg-green-100/80 text-green-700 rounded-full text-xs font-semibold">
                            活躍狀態
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* 內容區域 - 修正滾動和間距 */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 min-h-0">
                  {/* 快速資訊卡片 - 修正手機版佈局 */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-200/50">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold text-blue-700">
                            {selectedDetailSupplier.products ? selectedDetailSupplier.products.split(',').length : 0}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">供應品項</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-emerald-200/50">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold text-emerald-700">
                            {selectedDetailSupplier.contactWindow ? '1' : '0'}
                          </div>
                          <div className="text-xs text-emerald-600 font-medium">聯絡窗口</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-purple-200/50">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-purple-700 truncate">
                            {selectedDetailSupplier.contactMethod ? '已建立' : '未建立'}
                          </div>
                          <div className="text-xs text-purple-600 font-medium">聯絡管道</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-orange-200/50">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-orange-700 truncate">
                            {selectedDetailSupplier.liaisonPersonName ? '已指派' : '未指派'}
                          </div>
                          <div className="text-xs text-orange-600 font-medium">對接人員</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 主要資訊區域 - 修正手機版佈局 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* 基本資訊 - 修正手機版佈局 */}
                    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 shadow-lg">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">基本資訊</h3>
                      </div>
                      
                      <div className="space-y-4 sm:space-y-6">
                        <div className="p-3 sm:p-4 bg-blue-50/50 rounded-xl sm:rounded-2xl border border-blue-100/50">
                          <label className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2 block">供應商名稱</label>
                          <div className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 break-words">{selectedDetailSupplier.name || '-'}</div>
                        </div>
                        
                        <div className="p-3 sm:p-4 bg-indigo-50/50 rounded-xl sm:rounded-2xl border border-indigo-100/50">
                          <label className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 block">供應商品</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedDetailSupplier.products ? (
                              selectedDetailSupplier.products.split(',').map((product, i) => (
                                <span key={i} className="px-2 sm:px-3 py-1 bg-indigo-100/80 text-indigo-700 rounded-full text-xs sm:text-sm font-medium">
                                  {product.trim()}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-sm">未指定商品</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 聯絡資訊 - 修正手機版佈局 */}
                    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 shadow-lg">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">聯絡資訊</h3>
                      </div>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <div className="p-3 sm:p-4 bg-emerald-50/50 rounded-xl sm:rounded-2xl border border-emerald-100/50">
                          <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2 block">聯絡窗口</label>
                          <div className="text-base sm:text-lg font-bold text-slate-800 break-words">
                            {selectedDetailSupplier.contactWindow || '未指定'}
                          </div>
                        </div>
                        
                        <div className="p-3 sm:p-4 bg-purple-50/50 rounded-xl sm:rounded-2xl border border-purple-100/50">
                          <label className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-2 block">聯絡方式</label>
                          <div className="text-base sm:text-lg font-bold text-slate-800 break-words">
                            {selectedDetailSupplier.contactMethod || '未提供'}
                          </div>
                        </div>
                        
                        <div className="p-3 sm:p-4 bg-orange-50/50 rounded-xl sm:rounded-2xl border border-orange-100/50">
                          <label className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2 block">對接人員</label>
                          <div className="text-base sm:text-lg font-bold text-slate-800 break-words">
                            {selectedDetailSupplier.liaisonPersonName || '未指定'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 備註區域 - 修正手機版佈局 */}
                  {selectedDetailSupplier.notes && (
                    <div className="p-4 sm:p-6 lg:p-8 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 shadow-lg">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">詳細備註</h3>
                      </div>
                      
                      <div className="p-4 sm:p-6 bg-slate-50/50 rounded-xl sm:rounded-2xl border border-slate-100/50">
                        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base break-words">
                          {selectedDetailSupplier.notes}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 相關物料和香精 - 修正手機版佈局 */}
                  <SupplierRelatedItems supplierId={selectedDetailSupplier.id} />
                </div>

                {/* 底部操作區域 - 修正響應式和固定位置 */}
                <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-200/50 bg-white/50 backdrop-blur-sm">
                  <div className="text-xs text-slate-500 order-2 sm:order-1">
                    最後更新: {new Date().toLocaleDateString('zh-TW')}
                  </div>
                  
                  <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailViewOpen(false)}
                      className="flex-1 sm:flex-none border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-4 sm:px-6 py-2"
                    >
                      關閉
                    </Button>
                    {canManageSuppliers && (
                      <Button 
                        onClick={() => {
                          setIsDetailViewOpen(false);
                          setTimeout(() => {
                            handleEdit(selectedDetailSupplier);
                          }, 100);
                        }}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4 sm:px-6 py-2"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        編輯資料
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
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
      <div className="p-4 sm:p-6 lg:p-8 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">相關物料和香精</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 gap-3 sm:gap-0">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-orange-200/50 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-10 h-10 sm:w-12 sm:h-12 border-4 border-transparent border-t-orange-600 rounded-full animate-spin"></div>
          </div>
          <div className="flex items-center gap-2 sm:ml-4">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
          </div>
          <span className="sm:ml-4 text-sm sm:text-base text-slate-600 font-medium">載入相關資料中...</span>
        </div>
      </div>
    );
  }

  const hasItems = materials.length > 0 || fragrances.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/40 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">相關物料和香精</h3>
            <p className="text-xs sm:text-sm text-slate-600">供應商提供的相關產品項目</p>
          </div>
        </div>
        
        {hasItems && (
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{materials.length}</div>
              <div className="text-xs text-slate-600 font-medium">物料</div>
            </div>
            <div className="w-px h-6 sm:h-8 bg-slate-300"></div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{fragrances.length}</div>
              <div className="text-xs text-slate-600 font-medium">香精</div>
            </div>
          </div>
        )}
      </div>
      
      {!hasItems ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-orange-400" />
          </div>
          <h4 className="text-lg font-semibold text-slate-700 mb-2">暫無相關產品</h4>
          <p className="text-slate-500">此供應商尚未關聯任何物料或香精產品</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 相關物料 */}
          {materials.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">相關物料</h4>
                <span className="px-2 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-semibold">
                  {materials.length} 項
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {materials.map((material) => (
                  <div key={material.id} className="group bg-gradient-to-br from-blue-50/50 to-cyan-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-blue-700 transition-colors truncate">
                          {material.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate">{material.category} / {material.subCategory}</div>
                      </div>
                      <Badge variant="outline" className="text-xs font-semibold bg-white/80 flex-shrink-0">
                        {material.code}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                      <div className="p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">庫存</div>
                        <div className="font-bold text-slate-700 text-xs sm:text-sm truncate">{material.currentStock || 0} {material.unit}</div>
                      </div>
                      <div className="p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-green-600 font-medium uppercase tracking-wide">成本</div>
                        <div className="font-bold text-slate-700 text-xs sm:text-sm truncate">NT$ {material.costPerUnit || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 相關香精 */}
          {fragrances.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Droplets className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">相關香精</h4>
                <span className="px-2 py-1 bg-purple-100/80 text-purple-700 rounded-full text-xs font-semibold">
                  {fragrances.length} 項
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {fragrances.map((fragrance) => (
                  <div key={fragrance.id} className="group bg-gradient-to-br from-purple-50/50 to-pink-50/30 rounded-xl sm:rounded-2xl border border-purple-100/50 p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-purple-700 transition-colors truncate">
                          {fragrance.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate">{fragrance.fragranceType || fragrance.status}</div>
                      </div>
                      <Badge variant="outline" className="text-xs font-semibold bg-white/80 flex-shrink-0">
                        {fragrance.code}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                      <div className="p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">庫存</div>
                        <div className="font-bold text-slate-700 text-xs sm:text-sm truncate">{fragrance.currentStock || 0} {fragrance.unit || 'KG'}</div>
                      </div>
                      <div className="p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-green-600 font-medium uppercase tracking-wide">成本</div>
                        <div className="font-bold text-slate-700 text-xs sm:text-sm truncate">NT$ {fragrance.costPerUnit || 0}</div>
                      </div>
                    </div>
                    
                    {fragrance.percentage && (
                      <div className="mt-2 sm:mt-3 p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">濃度</div>
                        <div className="font-bold text-slate-700 text-xs sm:text-sm">{fragrance.percentage}%</div>
                      </div>
                    )}
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