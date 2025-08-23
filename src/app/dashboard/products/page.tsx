// src/app/dashboard/products/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { MoreHorizontal, Droplets, FileSpreadsheet, Eye, Edit, Package, Factory, Calendar, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';

import { ProductDialog, ProductData } from './ProductDialog'; 
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FragranceChangeDialog } from './FragranceChangeDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';

// 擴充介面，用於在前端顯示關聯資料的名稱
interface ProductWithDetails extends ProductData {
  seriesName: string;
  fragranceName: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isFragranceDialogOpen, setIsFragranceDialogOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<ProductWithDetails | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const seriesMap = new Map<string, string>();
      const fragrancesMap = new Map<string, string>();
      
      const seriesSnapshot = await getDocs(collection(db, "productSeries"));
      seriesSnapshot.forEach(doc => seriesMap.set(doc.id, doc.data().name));
      
      const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
      fragrancesSnapshot.forEach(doc => fragrancesMap.set(doc.id, doc.data().name));

      const productsSnapshot = await getDocs(collection(db, 'products'));
      
      const productsList = productsSnapshot.docs.map(doc => {
        const data = doc.data() as ProductData;
        return {
          ...data,
          id: doc.id,
          seriesName: seriesMap.get(data.seriesRef?.id) || '未知系列',
          fragranceName: fragrancesMap.get(data.currentFragranceRef?.id) || '未知香精',
        } as ProductWithDetails;
      });

      setProducts(productsList);
    } catch (error) {
      console.error("讀取產品資料失敗:", error);
      toast.error("讀取產品資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 操作處理函式
  const handleAdd = () => { setSelectedProduct(null); setIsDialogOpen(true); };
  const handleEdit = (product: ProductWithDetails) => { setSelectedProduct(product); setIsDialogOpen(true); };
  const handleDelete = (product: ProductWithDetails) => { setSelectedProduct(product); setIsConfirmOpen(true); };

  const handleViewDetail = (product: ProductWithDetails) => {
    setSelectedDetailProduct(product);
    setIsDetailViewOpen(true);
  };
  
  const handleFragranceChange = (product: ProductWithDetails) => { setSelectedProduct(product); setIsFragranceDialogOpen(true); };

  // 匯入/匯出處理函式
  const handleImport = async (data: any[]) => {
    const functions = getFunctions();
    const createProduct = httpsCallable(functions, 'createProduct');
    
    for (const item of data) {
      try {
        await createProduct(item);
      } catch (error) {
        console.error('匯入產品失敗:', error);
        throw error;
      }
    }
    loadData();
  };

  const handleExport = async () => {
    return products.map(product => ({
      name: product.name,
      code: product.code,
      seriesName: product.seriesName,
      fragranceName: product.fragranceName,
      description: product.description,
      status: product.status
    }));
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    const toastId = toast.loading("正在刪除產品...");
    try {
      const functions = getFunctions();
      const deleteProduct = httpsCallable(functions, 'deleteProduct');
      await deleteProduct({ productId: selectedProduct.id });

      toast.success(`產品 ${selectedProduct.name} 已成功刪除。`, { id: toastId });
      loadData();
    } catch (error) {
      console.error("刪除產品失敗:", error);
      let errorMessage = "刪除產品時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedProduct(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            產品管理
          </h1>
          <p className="text-gray-600 mt-2">管理產品系列與香精配置</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            匯入/匯出
          </Button>
          <Button 
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增產品
          </Button>
        </div>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            匯入/匯出
          </Button>
          <Button 
            onClick={handleAdd}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增產品
          </Button>
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-800">產品清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {products.length} 個
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-purple-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : products.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className="p-4 hover:bg-purple-50/50 transition-colors duration-200"
                      onClick={() => handleViewDetail(product)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                            <div className="text-xs text-gray-500">代號: {product.code}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              編輯產品
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFragranceChange(product)}>
                              <Droplets className="h-4 w-4 mr-2" />
                              更換香精
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(product)} className="text-red-600">
                              刪除產品
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Tag className="h-3 w-3 text-purple-600" />
                            <span className="text-gray-500">系列</span>
                          </div>
                          <span className="font-medium text-gray-700">{product.seriesName}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Droplets className="h-3 w-3 text-pink-600" />
                            <span className="text-gray-500">香精</span>
                          </div>
                          <span className="font-medium text-gray-700">{product.fragranceName}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">狀態</span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            product.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status === 'active' ? '活躍' : '非活躍'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-500">建立時間</span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {product.createdAt ? 
                              new Date(product.createdAt.toDate()).toLocaleDateString('zh-TW') : 
                              '未知'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有產品資料</h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">開始建立第一個產品來管理產品系列</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增產品
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
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">產品清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {products.length} 個產品
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">產品資訊</TableHead>
                <TableHead className="text-left">系列</TableHead>
                <TableHead className="text-left">香精</TableHead>
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
                        <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入產品資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-purple-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">產品代號: {product.code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">{product.seriesName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-pink-600" />
                        <span className="text-sm font-medium text-gray-700">{product.fragranceName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`status-badge ${product.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {product.status === 'active' ? '活躍' : '非活躍'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {product.createdAt ? 
                            new Date(product.createdAt.toDate()).toLocaleDateString('zh-TW') : 
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
                          <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看詳細
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            編輯產品
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleFragranceChange(product)}>
                            <Droplets className="h-4 w-4 mr-2" />
                            更換香精
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(product)}
                            className="text-red-600 focus:text-red-600"
                          >
                            刪除產品
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
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">沒有產品資料</h3>
                      <p className="text-gray-500 mb-4">開始建立第一個產品來管理產品系列</p>
                      <Button 
                        onClick={handleAdd}
                        variant="outline"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        新增產品
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

      <ProductDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProductUpdate={loadData}
        productData={selectedProduct}
      />

      {selectedProduct && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除產品`}
          description={`您確定要永久刪除產品「${selectedProduct.name}」嗎？此操作無法復原。`}
        />
      )}

      <FragranceChangeDialog
        isOpen={isFragranceDialogOpen}
        onOpenChange={setIsFragranceDialogOpen}
        onUpdate={loadData}
        productData={selectedProduct}
        currentFragranceName={selectedProduct?.fragranceName || ''}
      />

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={handleImport}
        onExport={handleExport}
        title="產品資料"
        description="匯入或匯出產品資料，支援 Excel 和 CSV 格式"
        sampleData={[
          {
            name: "示例產品",
            code: "PROD001",
            seriesName: "示例系列",
            fragranceName: "示例香精",
            description: "這是一個示例產品",
            status: "active"
          }
        ]}
        fields={[
          { key: "name", label: "產品名稱", required: true, type: "string" },
          { key: "code", label: "產品代號", required: true, type: "string" },
          { key: "seriesName", label: "產品系列", required: false, type: "string" },
          { key: "fragranceName", label: "香精名稱", required: false, type: "string" },
          { key: "description", label: "描述", required: false, type: "string" },
          { key: "status", label: "狀態", required: false, type: "string" }
        ]}
      />

      {selectedDetailProduct && (
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailProduct.name}
          subtitle={`代號: ${selectedDetailProduct.code}`}
          sections={[
            {
              title: "基本資訊",
              icon: <Package className="h-4 w-4" />,
              fields: [
                { label: "產品名稱", value: selectedDetailProduct.name },
                { label: "產品代號", value: selectedDetailProduct.code },
                { label: "產品系列", value: selectedDetailProduct.seriesName },
                { label: "描述", value: selectedDetailProduct.description },
                { label: "狀態", value: selectedDetailProduct.status === 'active' ? '活躍' : '非活躍' },
              ]
            },
            {
              title: "香精資訊",
              icon: <Droplets className="h-4 w-4" />,
              fields: [
                { label: "當前香精", value: selectedDetailProduct.fragranceName },
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
                handleEdit(selectedDetailProduct);
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
