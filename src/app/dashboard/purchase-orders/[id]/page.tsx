// src/app/dashboard/purchase-orders/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle, Truck } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold">採購單詳情</h1>
          <p className="text-muted-foreground font-mono">{po.code}</p>
        </div>
        {/* --- ** 新增：操作按鈕區塊 ** --- */}
        <div className="flex gap-2">
          {po.status === '預報單' && (
            <Button onClick={() => handleUpdateStatus('已訂購')} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              標示為已訂購
            </Button>
          )}
          {po.status === '已訂購' && (
            <Button onClick={() => setIsReceiveDialogOpen(true)} disabled={isUpdating}>
              <Truck className="mr-2 h-4 w-4" />
              收貨入庫
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>採購資訊</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-muted-foreground">狀態</p><p><Badge variant={getStatusVariant(po.status)}>{po.status}</Badge></p></div>
          <div><p className="text-muted-foreground">供應商</p><p className="font-medium">{po.supplierName}</p></div>
          <div><p className="text-muted-foreground">建立人員</p><p>{po.createdByName}</p></div>
          <div><p className="text-muted-foreground">建立時間</p><p>{po.createdAt}</p></div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>採購項目</CardTitle><CardDescription>此採購單中包含的所有項目列表。</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>品項代號</TableHead><TableHead>品項名稱</TableHead><TableHead className="text-right">採購數量</TableHead></TableRow></TableHeader>
            <TableBody>
              {po.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {po && <ReceiveDialog isOpen={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen} onSuccess={() => loadData(po.id)} purchaseOrder={po} />}
    </div>
  );
}
