// src/app/dashboard/products/fragrance-history/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useApiClient } from '@/hooks/useApiClient';
import { ArrowLeft, Search, Calendar, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Droplets, Package, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FragranceChangeHistory, FragranceChangeHistoryResult } from '@/types';

interface FragranceHistoryPageState {
  data: FragranceChangeHistory[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function FragranceHistoryPageContent() {
  const router = useRouter();
  const apiClient = useApiClient();
  const [state, setState] = useState<FragranceHistoryPageState>({
    data: [],
    loading: true,
    error: null,
    searchTerm: '',
    currentPage: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewProducts = hasPermission('products.view') || hasPermission('products:view');
  const canManageProducts = hasPermission('products.manage') || hasPermission('products:manage');

  // 載入香精更換歷史資料
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiClient.call('getFragranceChangeHistory', {
        page: state.currentPage,
        pageSize: state.pageSize,
        searchTerm: state.searchTerm.trim()
      });

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          data: result.data.data || [],
          total: result.data.total || 0,
          totalPages: result.data.totalPages || 0,
          loading: false,
        }));
      } else {
        throw new Error(result.error?.message || '載入資料失敗');
      }
    } catch (error) {
      console.error("載入香精更換歷史失敗:", error);
      const errorMessage = error instanceof Error ? error.message : "載入資料時發生錯誤";
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      toast.error(errorMessage);
    }
  }, [state.currentPage, state.pageSize, state.searchTerm, apiClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 處理搜尋
  const handleSearch = (searchValue: string) => {
    setState(prev => ({
      ...prev,
      searchTerm: searchValue,
      currentPage: 1, // 搜尋時回到第一頁
    }));
  };

  // 處理分頁
  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  // 處理頁面大小變更
  const handlePageSizeChange = (size: string) => {
    setState(prev => ({
      ...prev,
      pageSize: parseInt(size),
      currentPage: 1, // 變更頁面大小時回到第一頁
    }));
  };

  // 格式化日期
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '未知';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 權限保護
  if (!canViewProducts && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription>
            您沒有權限查看香精更換歷程。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題和返回按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="border-purple-200 text-purple-600 hover:bg-purple-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              香精更換歷程
            </h1>
            <p className="text-gray-600 mt-2">追蹤所有產品的香精更換記錄</p>
          </div>
        </div>
      </div>

      {/* 搜尋和篩選區域 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-indigo-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜尋框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-indigo-600" />
              <Input
                placeholder="搜尋產品名稱、香精代號、更換原因..."
                value={state.searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* 每頁顯示數量 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">每頁顯示</span>
              <Select value={state.pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600 whitespace-nowrap">筆記錄</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計資訊 */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>總計 {state.total} 筆更換記錄</span>
            </div>
            {state.searchTerm && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>搜尋「{state.searchTerm}」</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 桌面版表格 */}
      <div className="hidden lg:block">
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-background to-indigo-50 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-foreground">香精更換記錄</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                第 {state.currentPage} 頁，共 {state.totalPages} 頁
              </div>
            </div>
          </div>
          
          <div className="table-responsive">
            <Table className="table-enhanced">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">產品資訊</TableHead>
                  <TableHead className="text-left">香精更換</TableHead>
                  <TableHead className="text-left">更換原因</TableHead>
                  <TableHead className="text-left">更換日期</TableHead>
                  <TableHead className="text-left">操作人員</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-indigo-200 rounded-full animate-spin"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                        <span className="mt-4 text-muted-foreground font-medium">載入歷史記錄中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : state.error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <AlertDescription className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">載入失敗</h3>
                        <p className="text-muted-foreground mb-4">{state.error}</p>
                        <Button onClick={loadData} variant="outline">重新載入</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : state.data.length > 0 ? (
                  state.data.map((record) => (
                    <TableRow 
                      key={record.id} 
                      className="hover:bg-indigo-50/50 transition-all duration-200"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{record.productName}</div>
                            <div className="text-xs text-green-600 font-medium">{record.productCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {record.oldFragranceCode}
                            </Badge>
                            <span className="text-gray-400">→</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {record.newFragranceCode}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.oldFragranceName} → {record.newFragranceName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 truncate" title={record.changeReason}>
                            {record.changeReason}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">
                          {formatDate(record.changeDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">
                          {record.changedByName}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                          <Droplets className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">沒有歷史記錄</h3>
                        <p className="text-muted-foreground text-center">
                          {state.searchTerm ? '沒有符合搜尋條件的記錄' : '還沒有任何香精更換記錄'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 手機版卡片顯示 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-indigo-600" />
                <h2 className="text-base font-semibold text-gray-800">香精更換記錄</h2>
              </div>
              <div className="text-xs text-gray-600">
                第 {state.currentPage}/{state.totalPages} 頁
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {state.loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-indigo-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
                <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
              </div>
            ) : state.data.length > 0 ? (
              state.data.map((record) => (
                <div key={record.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{record.productName}</div>
                      <div className="text-xs text-green-600 font-medium">{record.productCode}</div>
                    </div>
                    <div className="text-xs text-gray-500 text-right flex-shrink-0">
                      {formatDate(record.changeDate)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">香精更換</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                          {record.oldFragranceCode}
                        </Badge>
                        <span className="text-gray-400 text-xs">→</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          {record.newFragranceCode}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {record.oldFragranceName} → {record.newFragranceName}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">更換原因</div>
                      <div className="text-sm text-gray-700">{record.changeReason}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">操作人員</div>
                      <div className="text-sm text-gray-700">{record.changedByName}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Droplets className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">沒有歷史記錄</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {state.searchTerm ? '沒有符合搜尋條件的記錄' : '還沒有任何香精更換記錄'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 分頁控制 */}
      {state.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 分頁資訊 */}
          <div className="text-sm text-gray-600">
            顯示第 {(state.currentPage - 1) * state.pageSize + 1} 到 {Math.min(state.currentPage * state.pageSize, state.total)} 筆，共 {state.total} 筆記錄
          </div>
          
          {/* 分頁按鈕 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={state.currentPage === 1}
              className="hidden sm:flex"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(state.currentPage - 1)}
              disabled={state.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一頁
            </Button>
            
            {/* 頁碼顯示 */}
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, state.totalPages))].map((_, index) => {
                const pageNum = Math.max(1, state.currentPage - 2) + index;
                if (pageNum > state.totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === state.currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 p-0 ${
                      pageNum === state.currentPage 
                        ? "bg-indigo-600 text-white" 
                        : "hover:bg-indigo-50"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(state.currentPage + 1)}
              disabled={state.currentPage === state.totalPages}
            >
              下一頁
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(state.totalPages)}
              disabled={state.currentPage === state.totalPages}
              className="hidden sm:flex"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FragranceHistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FragranceHistoryPageContent />
    </Suspense>
  );
}