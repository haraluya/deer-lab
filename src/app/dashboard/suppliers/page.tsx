// src/app/dashboard/suppliers/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { SupplierDialog, SupplierData } from './SupplierDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, Eye, Edit, Building, MapPin, Phone, Mail, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';

function SuppliersPageContent() {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedDetailSupplier, setSelectedDetailSupplier] = useState<SupplierData | null>(null);
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
      const suppliersList = suppliersSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      })) as SupplierData[];
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

  const handleViewDetail = (supplier: SupplierData) => {
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

      {/* 手機版表格容器 */}
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
                      className="p-4 hover:bg-blue-50/50 transition-colors duration-200"
                      onClick={() => handleViewDetail(supplier)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Building className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{supplier.name}</div>
                            <div className="text-xs text-gray-500">ID: {supplier.id}</div>
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
                            <span className="text-gray-500">聯絡資訊</span>
                          </div>
                          <div className="space-y-1">
                            {supplier.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <span className="font-medium text-gray-700">{supplier.phone}</span>
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="font-medium text-gray-700">{supplier.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <MapPin className="h-3 w-3 text-blue-600" />
                            <span className="text-gray-500">地址</span>
                          </div>
                          <span className="font-medium text-gray-700">{supplier.address || '未提供地址'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">狀態</span>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              supplier.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {supplier.status === 'active' ? '活躍' : '非活躍'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-500">建立時間</span>
                            </div>
                            <span className="text-xs text-gray-600">
                              {supplier.createdAt ? 
                                new Date(supplier.createdAt.toDate()).toLocaleDateString('zh-TW') : 
                                '未知'
                              }
                            </span>
                          </div>
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

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">供應商清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {suppliers.length} 個供應商
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">供應商名稱</TableHead>
                <TableHead className="text-left">聯絡資訊</TableHead>
                <TableHead className="text-left">地址</TableHead>
                <TableHead className="text-left">狀態</TableHead>
                <TableHead className="text-left">建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入供應商資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-blue-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{supplier.name}</div>
                          <div className="text-xs text-gray-500">供應商 ID: {supplier.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-700">{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-700">{supplier.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 line-clamp-2">
                          {supplier.address || '未提供地址'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`status-badge ${supplier.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {supplier.status === 'active' ? '活躍' : '非活躍'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {supplier.createdAt ? 
                            new Date(supplier.createdAt.toDate()).toLocaleDateString('zh-TW') : 
                            '未知'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">開啟選單</span>
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
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
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
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
        </div>
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

      {selectedDetailSupplier && (
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailSupplier.name}
          subtitle="供應商詳細資訊"
          sections={[
            {
              title: "基本資訊",
              icon: <Building className="h-4 w-4" />,
              fields: [
                { label: "供應商名稱", value: selectedDetailSupplier.name },
                { label: "聯絡電話", value: selectedDetailSupplier.phone },
                { label: "電子郵件", value: selectedDetailSupplier.email },
                { label: "地址", value: selectedDetailSupplier.address },
                { label: "狀態", value: selectedDetailSupplier.status === 'active' ? '活躍' : '非活躍' },
              ]
            }
          ]}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsDetailViewOpen(false)}>
                關閉
              </Button>
              <Button onClick={() => {
                setIsDetailViewOpen(false);
                handleEdit(selectedDetailSupplier);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}


export default function SuppliersPage() {
  return (
    <SuppliersPageContent />
  );
}
