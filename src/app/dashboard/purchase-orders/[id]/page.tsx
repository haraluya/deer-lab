// src/app/dashboard/purchase-orders/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle, Truck, ShoppingCart, Building, User, Calendar, Package } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReceiveDialog } from './ReceiveDialog'; // 引入新元件

interface PurchaseOrderItem {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  itemRef: any; // Keep the ref for the receive dialog
}

interface PurchaseOrderDetails extends DocumentData {
  id: string;
  code: string;
  supplierName: string;
  status: '預報單' | '已訂購' | '已收貨' | '已取消';
  createdByName: string;
  createdAt: string;
  items: PurchaseOrderItem[];
}

interface SupplierDoc { name: string; }
interface UserDoc { name: string; }

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [po, setPo] = useState<PurchaseOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);

  const loadData = useCallback(async (poId: string) => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const poRef = doc(db, 'purchaseOrders', poId);
      const poSnap = await getDoc(poRef);

      if (!poSnap.exists()) {
        toast.error("找不到指定的採購單。");
        router.push('/dashboard/purchase-orders');
        return;
      }

      const data = poSnap.data();
      const supplierSnap = data.supplierRef ? await getDoc(data.supplierRef) : null;
      const createdBySnap = data.createdByRef ? await getDoc(data.createdByRef) : null;
      const createdAt = (data.createdAt as Timestamp)?.toDate().toLocaleString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'N/A';

      setPo({
        id: poSnap.id,
        code: data.code,
        supplierName: (supplierSnap?.data() as SupplierDoc)?.name || '未知供應商',
        status: data.status,
        createdByName: (createdBySnap?.data() as UserDoc)?.name || '未知人員',
        createdAt: createdAt,
        items: data.items || [],
      });

    } catch (error) {
      console.error("讀取採購單詳情失敗:", error);
      toast.error("讀取採購單詳情失敗。");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof id === 'string') {
      loadData(id);
    }
  }, [id, loadData]);

  const handleUpdateStatus = async (newStatus: PurchaseOrderDetails['status']) => {
    if (!po) return;
    setIsUpdating(true);
    const toastId = toast.loading(`正在將狀態更新為 "${newStatus}"...`);
    try {
      const functions = getFunctions();
      const updatePurchaseOrderStatus = httpsCallable(functions, 'updatePurchaseOrderStatus');
      await updatePurchaseOrderStatus({ purchaseOrderId: po.id, newStatus });
      toast.success("狀態更新成功。", { id: toastId });
      loadData(po.id); // 重新載入資料以顯示最新狀態
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "狀態更新失敗";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!po) {
    return <div className="text-center py-10">無法載入採購單資料。</div>;
  }
  
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
      {/* 頁面標題區域 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className="hover:bg-amber-50 border-amber-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-amber-600">
              採購單詳情
            </h1>
            <p className="text-muted-foreground mt-2">查看採購單的詳細資訊</p>
          </div>
        </div>
        
        {/* 操作按鈕區域 */}
        <div className="flex gap-2">
          {po.status === '預報單' && (
            <Button 
              onClick={() => handleUpdateStatus('已訂購')} 
              disabled={isUpdating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              標示為已訂購
            </Button>
          )}
          {po.status === '已訂購' && (
            <Button 
              onClick={() => setIsReceiveDialogOpen(true)} 
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              <Truck className="mr-2 h-4 w-4" />
              收貨入庫
            </Button>
          )}
        </div>
      </div>

      {/* 採購單基本資訊卡片 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-amber-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <ShoppingCart className="h-5 w-5" />
            採購單資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">採購單編號</p>
                  <p className="text-lg font-bold text-gray-900">{po.code}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">供應商</p>
                  <p className="text-lg font-semibold text-gray-900">{po.supplierName}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">建立人員</p>
                  <p className="text-lg font-semibold text-gray-900">{po.createdByName}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">建立時間</p>
                  <p className="text-lg font-semibold text-gray-900">{po.createdAt}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 狀態顯示 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">當前狀態：</span>
              <Badge 
                variant={getStatusVariant(po.status)}
                className={`text-sm font-medium px-3 py-1 ${
                  po.status === '已收貨' ? 'bg-green-100 text-green-800 border-green-200' :
                  po.status === '已訂購' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  po.status === '已取消' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {po.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 採購項目列表卡片 */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            採購項目清單
          </CardTitle>
          <CardDescription>此採購單中包含的所有項目列表</CardDescription>
        </CardHeader>
        <CardContent>
          {po.items.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">品項代號</TableHead>
                    <TableHead className="font-semibold text-gray-700">品項名稱</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">採購數量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items.map((item, index) => (
                    <TableRow key={index} className="hover:bg-amber-50/30 transition-colors duration-200">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-mono font-medium text-gray-900">{item.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-amber-600">
                          {item.quantity} {item.unit}
                        </span>
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
              <h3 className="text-base font-medium text-gray-900 mb-1">沒有採購項目</h3>
              <p className="text-sm text-gray-500 text-center">
                此採購單目前沒有包含任何項目
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 收貨對話框 */}
      {po && <ReceiveDialog isOpen={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen} onSuccess={() => loadData(po.id)} purchaseOrder={po} />}
    </div>
  );
}
