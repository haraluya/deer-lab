// src/app/dashboard/purchase-orders/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthWrapper } from '@/components/AuthWrapper';
import { toast } from 'sonner';
import { MoreHorizontal, Eye, Edit, Trash2, ShoppingCart, Calendar, Building, User, Plus } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';

// 定義從 Firestore 讀取並處理後的採購單資料結構
interface PurchaseOrderView {
  id: string;
  code: string;
  supplierName: string;
  status: '預報單' | '已訂購' | '已收貨' | '已取消';
  createdByName: string;
  createdAt: string;
}

function PurchaseOrdersPageContent() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. 預先載入所有供應商和使用者資料，存入 Map 以便快速查找
      const suppliersMap = new Map<string, string>();
      const usersMap = new Map<string, string>();
      
      const supplierSnapshot = await getDocs(collection(db, "suppliers"));
      supplierSnapshot.forEach(doc => suppliersMap.set(doc.id, doc.data().name));
      
      const userSnapshot = await getDocs(collection(db, "users"));
      userSnapshot.forEach(doc => usersMap.set(doc.id, doc.data().name));

      // 2. 獲取所有採購單資料
      const poSnapshot = await getDocs(collection(db, 'purchaseOrders'));
      
      // 3. 遍歷採購單，解析關聯的名稱和日期
      const poList = poSnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = (data.createdAt as Timestamp)?.toDate().toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) || 'N/A';

        return {
          id: doc.id,
          code: data.code,
          supplierName: suppliersMap.get(data.supplierRef?.id) || '未知供應商',
          status: data.status,
          createdByName: usersMap.get(data.createdByRef?.id) || '未知人員',
          createdAt: createdAt,
        } as PurchaseOrderView;
      });

      // 根據建立時間排序 (最新的在最前面)
      setPurchaseOrders(poList.sort((a, b) => b.code.localeCompare(a.code)));

    } catch (error) {
      console.error("讀取採購單資料失敗:", error);
      toast.error("讀取採購單資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/purchase-orders/${id}`);
  };

  const handleCreateNew = () => {
    router.push('/dashboard/purchase-orders/create');
  };

  const handleViewDetail = (order: PurchaseOrderView) => {
    router.push(`/dashboard/purchase-orders/${order.id}`);
  };

  const handleEdit = (order: PurchaseOrderView) => {
    router.push(`/dashboard/purchase-orders/${order.id}/edit`);
  };

  const handleDelete = (order: PurchaseOrderView) => {
    // TODO: Implement delete functionality
    console.log('Delete order:', order.id);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case '已收貨': return 'default';
      case '已訂購': return 'secondary';
      case '預報單': return 'outline';
      case '已取消': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            採購單管理
          </h1>
          <p className="text-gray-600 mt-2">管理採購訂單與供應商交易</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <Button 
          onClick={handleCreateNew}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增採購單
        </Button>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex justify-end">
          <Button 
            onClick={handleCreateNew}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增採購單
          </Button>
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-amber-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
                <h2 className="text-base font-semibold text-gray-800">採購單清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {purchaseOrders.length} 張
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-amber-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-amber-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : purchaseOrders.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {purchaseOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 hover:bg-amber-50/50 transition-colors duration-200"
                      onClick={() => handleViewDetail(order)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{order.code}</div>
                            <div className="text-xs text-gray-500">ID: {order.id}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(order)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(order)}>
                              <Edit className="mr-2 h-4 w-4" />
                              編輯採購單
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(order)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              刪除採購單
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Building className="h-3 w-3 text-blue-600" />
                            <span className="text-gray-500">供應商</span>
                          </div>
                          <span className="font-medium text-gray-700">{order.supplierName}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-500">建立人員</span>
                          </div>
                          <span className="font-medium text-gray-700">{order.createdByName}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">狀態</span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === '已收貨' ? 'bg-green-100 text-green-800' : 
                            order.status === '已訂購' ? 'bg-yellow-100 text-yellow-800' : 
                            order.status === '已取消' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-500">建立時間</span>
                          </div>
                          <span className="text-xs text-gray-600">{order.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <ShoppingCart className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有採購單資料</h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">開始建立第一張採購單來管理供應商交易</p>
                  <Button 
                    onClick={handleCreateNew}
                    variant="outline"
                    size="sm"
                    className="border-amber-200 text-amber-600 hover:bg-amber-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增採購單
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
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-amber-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-800">採購單清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {purchaseOrders.length} 張採購單
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">採購單資訊</TableHead>
                <TableHead className="text-left">供應商</TableHead>
                <TableHead className="text-left">建立人員</TableHead>
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
                        <div className="w-12 h-12 border-4 border-amber-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-amber-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入採購單資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : purchaseOrders.length > 0 ? (
                purchaseOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-amber-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{order.code}</div>
                          <div className="text-xs text-gray-500">採購單 ID: {order.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">{order.supplierName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{order.createdByName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`status-badge ${
                        order.status === '已收貨' ? 'status-active' : 
                        order.status === '已訂購' ? 'status-warning' : 
                        order.status === '已取消' ? 'status-inactive' : 
                        'status-neutral'
                      }`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{order.createdAt}</span>
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
                          <DropdownMenuItem onClick={() => handleViewDetails(order.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看詳細
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
                        <ShoppingCart className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">沒有採購單資料</h3>
                      <p className="text-gray-500 mb-4">開始建立第一張採購單來管理供應商交易</p>
                      <Button 
                        onClick={handleCreateNew}
                        variant="outline"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        新增採購單
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
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <AuthWrapper>
      <PurchaseOrdersPageContent />
    </AuthWrapper>
  );
}
