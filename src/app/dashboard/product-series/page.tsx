// src/app/dashboard/product-series/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';

import { SeriesDialog, SeriesData } from './SeriesDialog';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { MoreHorizontal, FileSpreadsheet, Plus, Eye, Edit, Trash2, Tag, Calendar, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { ImportExportDialog } from '@/components/ImportExportDialog';

interface SeriesWithMaterials extends SeriesData {
  materialNames: string[];
}

function ProductSeriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [series, setSeries] = useState<SeriesWithMaterials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesData | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const materialsMap = new Map<string, string>();
      const materialSnapshot = await getDocs(collection(db, "materials"));
      materialSnapshot.forEach(doc => materialsMap.set(doc.id, doc.data().name));

      const seriesSnapshot = await getDocs(collection(db, 'productSeries'));
      const seriesList = seriesSnapshot.docs.map(doc => {
        const data = doc.data();
        const materialRefs = data.commonMaterials as DocumentReference[] || [];
        const materialNames = materialRefs.map(ref => materialsMap.get(ref.id) || '未知物料');
        
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          commonMaterials: data.commonMaterials,
          materialNames,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as SeriesWithMaterials;
      });
      setSeries(seriesList);
    } catch (error) {
      console.error("讀取產品系列資料失敗:", error);
      toast.error("讀取產品系列資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && series.length > 0) {
      const seriesToEdit = series.find(s => s.id === editId);
      if (seriesToEdit) {
        setSelectedSeries(seriesToEdit);
        setIsDialogOpen(true);
        // 清除 URL 中的 edit 參數
        router.replace('/dashboard/product-series');
      }
    }
  }, [searchParams, series, router]);

  const handleAdd = () => { setSelectedSeries(null); setIsDialogOpen(true); };
  const handleEdit = (data: SeriesData) => { setSelectedSeries(data); setIsDialogOpen(true); };
  const handleDelete = (data: SeriesData) => { setSelectedSeries(data); setIsConfirmOpen(true); };
  const handleViewDetail = (data: SeriesData) => {
    // TODO: Implement view detail functionality
    console.log('View detail:', data);
  };

  // 匯入/匯出處理函式
  const handleImport = async (data: any[]) => {
    const functions = getFunctions();
    const createProductSeries = httpsCallable(functions, 'createProductSeries');
    
    for (const item of data) {
      try {
        await createProductSeries(item);
      } catch (error) {
        console.error('匯入產品系列失敗:', error);
        throw error;
      }
    }
    loadData();
  };

  const handleExport = async () => {
    return series.map(series => ({
      name: series.name,
      code: series.code,
      materialNames: series.materialNames.join(', ')
    }));
  };

  const handleConfirmDelete = async () => {
    if (!selectedSeries) return;
    const toastId = toast.loading("正在刪除系列...");
    try {
      const functions = getFunctions();
      const deleteProductSeries = httpsCallable(functions, 'deleteProductSeries');
      await deleteProductSeries({ seriesId: selectedSeries.id });
      toast.success(`系列 ${selectedSeries.name} 已成功刪除。`, { id: toastId });
      loadData();
    } catch (error) {
      console.error("刪除系列失敗:", error);
      let errorMessage = "刪除系列時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedSeries(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            產品系列管理
          </h1>
          <p className="text-gray-600 mt-2">管理產品系列與常用物料配置</p>
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
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增系列
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增系列
          </Button>
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-600" />
                <h2 className="text-base font-semibold text-gray-800">產品系列清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {series.length} 個
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-indigo-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : series.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {series.map((seriesItem) => (
                    <div 
                      key={seriesItem.id} 
                      className="p-4 hover:bg-indigo-50/50 transition-colors duration-200"
                      onClick={() => handleViewDetail(seriesItem)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Tag className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{seriesItem.name}</div>
                            <div className="text-xs text-gray-500">代號: {seriesItem.code}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(seriesItem)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(seriesItem)}>
                              <Edit className="mr-2 h-4 w-4" />
                              編輯系列
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(seriesItem)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              刪除系列
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">常用物料</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {seriesItem.materialNames.length > 0 ? (
                              seriesItem.materialNames.slice(0, 3).map((material, index) => (
                                <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                  {material}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">無常用物料</span>
                            )}
                            {seriesItem.materialNames.length > 3 && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                                +{seriesItem.materialNames.length - 3} 更多
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">建立時間</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {seriesItem.createdAt ? 
                              new Date(seriesItem.createdAt.toDate()).toLocaleDateString('zh-TW') : 
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
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Tag className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-1">沒有產品系列資料</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">開始建立第一個產品系列來管理常用物料</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增系列
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-background to-primary/10 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">產品系列清單</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              共 {series.length} 個系列
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">系列資訊</TableHead>
                <TableHead className="text-left">常用物料</TableHead>
                <TableHead className="text-left">建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-muted-foreground font-medium">載入系列資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : series.length > 0 ? (
                series.map((seriesItem) => (
                  <TableRow 
                    key={seriesItem.id} 
                    className="hover:bg-primary/5 transition-colors duration-200 cursor-pointer"
                    onClick={() => router.push(`/dashboard/product-series/${seriesItem.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Tag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{seriesItem.name}</div>
                          <div className="text-xs text-muted-foreground">系列代號: {seriesItem.code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {seriesItem.materialNames.length > 0 ? (
                          seriesItem.materialNames.slice(0, 3).map((material, index) => (
                            <Badge key={index} className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">
                              {material}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">無常用物料</span>
                        )}
                        {seriesItem.materialNames.length > 3 && (
                          <Badge className="bg-muted text-muted-foreground border-border text-xs">
                            +{seriesItem.materialNames.length - 3} 更多
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {seriesItem.createdAt ? 
                            new Date(seriesItem.createdAt.toDate()).toLocaleDateString('zh-TW') : 
                            '未知'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">開啟選單</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(seriesItem)}>
                            <Edit className="h-4 w-4 mr-2" />
                            編輯系列
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(seriesItem)}
                            className="text-red-600 focus:text-red-600"
                          >
                            刪除系列
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Tag className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">沒有產品系列資料</h3>
                      <p className="text-muted-foreground mb-4">開始建立第一個產品系列來管理產品分類</p>
                      <Button 
                        onClick={handleAdd}
                        variant="outline"
                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        新增系列
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

      <SeriesDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSeriesUpdate={loadData}
        seriesData={selectedSeries}
      />

      {selectedSeries && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除系列`}
          description={`您確定要永久刪除系列「${selectedSeries.name}」嗎？此操作無法復原。`}
        />
      )}

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={handleImport}
        onExport={handleExport}
        title="產品系列資料"
        description="匯入或匯出產品系列資料，支援 Excel 和 CSV 格式"
        sampleData={[
          {
            name: "示例系列",
            code: "SERIES001",
            materialNames: "示例物料1, 示例物料2"
          }
        ]}
        fields={[
          { key: "name", label: "系列名稱", required: true, type: "string" },
          { key: "code", label: "系列代號", required: true, type: "string" },
          { key: "materialNames", label: "常用物料", required: false, type: "string" }
        ]}
      />
    </div>
  );
}


export default function ProductSeriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductSeriesPageContent />
    </Suspense>
  );
}
