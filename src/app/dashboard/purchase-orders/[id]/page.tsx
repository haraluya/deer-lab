// src/app/dashboard/purchase-orders/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc, updateDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiForm } from '@/hooks/useApiClient';
import { toast } from 'sonner';
import { uploadMultipleImages } from '@/lib/imageUpload';
import { ArrowLeft, Loader2, CheckCircle, Truck, ShoppingCart, Building, User, Calendar, Package, Plus, MessageSquare, Upload, X, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ReceiveDialog } from './ReceiveDialog'; // 引入新元件

interface PurchaseOrderItem {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  itemRef: any; // Keep the ref for the receive dialog
}

interface AdditionalFee {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  unit: string;
  description?: string;
}

interface Comment {
  id: string;
  text: string;
  images: string[];
  createdAt: string;
  createdBy: string;
}

interface PurchaseOrderDetails extends DocumentData {
  id: string;
  code: string;
  supplierName: string;
  status: '預報單' | '已訂購' | '已收貨' | '已取消';
  createdByName: string;
  createdAt: string;
  items: PurchaseOrderItem[];
  additionalFees?: AdditionalFee[];
  comments?: Comment[];
}

interface SupplierDoc { name: string; }
interface UserDoc { name: string; }

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const apiClient = useApiForm();

  const [po, setPo] = useState<PurchaseOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [editedItems, setEditedItems] = useState<PurchaseOrderItem[]>([]);
  const [editedAdditionalFees, setEditedAdditionalFees] = useState<AdditionalFee[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isAddFeeDialogOpen, setIsAddFeeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newFee, setNewFee] = useState<Omit<AdditionalFee, 'id'>>({
    name: '',
    amount: 0,
    quantity: 1,
    unit: '項',
    description: ''
  });

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

      const purchaseOrderData = {
        id: poSnap.id,
        code: data.code,
        supplierName: (supplierSnap?.data() as SupplierDoc)?.name || '未知供應商',
        status: data.status,
        createdByName: (createdBySnap?.data() as UserDoc)?.name || '未知人員',
        createdAt: createdAt,
        items: data.items || [],
        additionalFees: data.additionalFees || [],
        comments: data.comments || [],
      };
      
      setPo(purchaseOrderData);
      setEditedItems([...data.items || []]);
      setEditedAdditionalFees([...data.additionalFees || []]);
      setComments([...data.comments || []]);

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

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setEditedItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity: newQuantity };
      return newItems;
    });
  };

  const handleCostPerUnitChange = (index: number, newCostPerUnit: number) => {
    if (newCostPerUnit < 0) return;
    
    setEditedItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], costPerUnit: newCostPerUnit };
      return newItems;
    });
  };

  // 處理其他費用
  const handleAddAdditionalFee = () => {
    if (!newFee.name || newFee.amount <= 0) {
      toast.error("請填寫費用名稱和金額");
      return;
    }

    const fee: AdditionalFee = {
      id: Date.now().toString(),
      ...newFee
    };

    setEditedAdditionalFees(prev => [...prev, fee]);
    setNewFee({
      name: '',
      amount: 0,
      quantity: 1,
      unit: '項',
      description: ''
    });
    setIsAddFeeDialogOpen(false);
    toast.success("已添加其他費用");
  };

  const handleRemoveAdditionalFee = (feeId: string) => {
    setEditedAdditionalFees(prev => prev.filter(fee => fee.id !== feeId));
    toast.success("已移除其他費用");
  };

  // 使用成熟的圖片上傳工具
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const toastId = toast.loading("正在處理圖片...");
    
    try {
      // 檢查總檔案大小
      const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = 10 * 1024 * 1024; // 10MB 總限制
      
      if (totalSize > maxTotalSize) {
        toast.error(`總檔案大小不能超過 10MB，請選擇較小的圖片`, { id: toastId });
        return;
      }
      
      const results = await uploadMultipleImages(fileArray, {
        folder: `purchase-orders/${id}/comments`,
        maxSize: 2, // 每張圖片最大 2MB
        compress: true,
        quality: 0.6
      });
      
      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);
      
      // 更新已上傳的圖片列表
      if (successfulUploads.length > 0) {
        const urls = successfulUploads.map(result => result.url!);
        setUploadedImages(prev => [...prev, ...urls]);
        toast.success(`成功上傳 ${successfulUploads.length} 張圖片`, { id: toastId });
      }
      
      // 顯示失敗的圖片
      if (failedUploads.length > 0) {
        const failedNames = failedUploads.map(result => result.error).join(', ');
        toast.error(`以下圖片上傳失敗: ${failedNames}`, { id: toastId });
      }
      
    } catch (error) {
      console.error('圖片處理失敗:', error);
      toast.error(`圖片處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, { id: toastId });
    }
    
    // 清空 input 值，允許重複選擇相同檔案
    event.target.value = '';
  };

  // 移除已上傳的圖片
  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 處理留言
  const handleAddComment = async () => {
    if (!newComment.trim() && uploadedImages.length === 0) {
      toast.error("請輸入留言內容或上傳圖片");
      return;
    }

    if (!po || !db) return;

    try {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        images: uploadedImages,
        createdAt: new Date().toISOString(),
        createdBy: po.createdByName || "當前用戶"
      };

      // 更新採購單文檔
      const docRef = doc(db, "purchaseOrders", po.id);
      const updatedComments = [...comments, comment];
      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: Timestamp.now()
      });

      // 更新本地狀態
      setComments(updatedComments);
      setPo(prev => prev ? { ...prev, comments: updatedComments } : null);
      
      // 清空表單
      setNewComment('');
      setUploadedImages([]);
      
      toast.success("留言已新增");
    } catch (error) {
      console.error("新增留言失敗:", error);
      toast.error("新增留言失敗");
    }
  };

  // 刪除留言
  const handleDeleteComment = async (commentId: string) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      // 刪除相關圖片
      if (comment.images.length > 0) {
        const { getStorage, ref, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        
        const deletePromises = comment.images.map(async (imageURL) => {
          try {
            const imageRef = ref(storage, imageURL);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('刪除圖片失敗:', error);
          }
        });
        
        await Promise.all(deletePromises);
      }

      // 從本地狀態中移除留言
      const updatedComments = comments.filter(c => c.id !== commentId);
      setComments(updatedComments);
      
      // 更新採購單文檔
      if (po && db) {
        const docRef = doc(db, "purchaseOrders", po.id);
        await updateDoc(docRef, {
          comments: updatedComments,
          updatedAt: Timestamp.now()
        });
        
        setPo(prev => prev ? { ...prev, comments: updatedComments } : null);
      }
      
      toast.success('留言已刪除');
    } catch (error) {
      console.error('刪除留言失敗:', error);
      toast.error('刪除留言失敗');
    }
  };



  // 刪除整個採購單功能
  const handleDeletePurchaseOrder = async () => {
    if (!po || !db) return;
    
    setIsDeleting(true);
    const toastId = toast.loading("正在刪除採購單...");
    
    try {
      // 1. 刪除所有留言的圖片
      const allImages = comments.flatMap(comment => comment.images);
      if (allImages.length > 0) {
        const { getStorage, ref, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        
        const deleteImagePromises = allImages.map(async (imageURL) => {
          try {
            const imageRef = ref(storage, imageURL);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('刪除圖片失敗:', error);
          }
        });
        
        await Promise.all(deleteImagePromises);
      }

      // 2. 刪除採購單文檔
      const { doc, deleteDoc } = await import('firebase/firestore');
      const poRef = doc(db, 'purchaseOrders', po.id);
      await deleteDoc(poRef);

      toast.success("採購單已刪除", { id: toastId });
      
      // 3. 返回採購單列表頁面
      router.push('/dashboard/purchase-orders');
      
    } catch (error) {
      console.error("刪除採購單失敗:", error);
      toast.error("刪除採購單失敗", { id: toastId });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!po || !db) return;
    setIsUpdating(true);
    const toastId = toast.loading("正在儲存變更...");
    
    try {
      // 更新 Firestore 中的採購單
      const docRef = doc(db, "purchaseOrders", po.id);
      await updateDoc(docRef, {
        items: editedItems,
        additionalFees: editedAdditionalFees,
        updatedAt: Timestamp.now()
      });

      // 更新本地狀態
      setPo(prev => prev ? { 
        ...prev, 
        items: editedItems,
        additionalFees: editedAdditionalFees
      } : null);
      
      toast.success("變更已儲存", { id: toastId });
    } catch (error) {
      console.error("儲存變更失敗:", error);
      toast.error("儲存變更失敗", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: PurchaseOrderDetails['status']) => {
    if (!po) return;
    setIsUpdating(true);
    
    try {
      const result = await apiClient.callGeneric('updatePurchaseOrderStatus', { 
        purchaseOrderId: po.id, 
        newStatus 
      });
      
      if (result.success) {
        toast.success("狀態更新成功。");
        loadData(po.id); // 重新載入資料以顯示最新狀態
      }
    } catch (error) {
      console.error('狀態更新失敗:', error);
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
    <div className="container mx-auto p-2 sm:p-4 py-4 sm:py-10">
      {/* 頁面標題區域 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className="hover:bg-amber-50 border-amber-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-amber-600 truncate">
              採購單詳情
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">查看採購單的詳細資訊</p>
          </div>
        </div>
        
        {/* 操作按鈕區域 */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {po.status === '預報單' && (
            <Button 
              onClick={() => handleUpdateStatus('已訂購')} 
              disabled={isUpdating}
              className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
            >
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              標示為已訂購
            </Button>
          )}
          {po.status === '已訂購' && (
            <Button 
              onClick={() => setIsReceiveDialogOpen(true)} 
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              <Truck className="mr-2 h-4 w-4" />
              收貨入庫
            </Button>
          )}
          <Button 
            onClick={() => setIsDeleteDialogOpen(true)} 
            disabled={isDeleting}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            刪除訂單
          </Button>
        </div>
      </div>

      {/* 採購單基本資訊卡片 */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-amber-10">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-amber-600 text-lg sm:text-xl">
            <ShoppingCart className="h-5 w-5" />
            採購單資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
                  po.status === '預報單' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                  po.status === '已訂購' ? 'bg-green-100 text-green-800 border-green-200' :
                  po.status === '已收貨' ? 'bg-gray-600 text-white border-gray-600' :
                  po.status === '已取消' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-gray-600 text-white border-gray-600'
                }`}
              >
                {po.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 採購項目列表卡片 */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-5 w-5 text-amber-600" />
            採購項目清單
          </CardTitle>
          <CardDescription>此採購單中包含的所有項目列表</CardDescription>
        </CardHeader>
        <CardContent>
          {po.items.length > 0 ? (
            <>
              {/* 桌面版表格 */}
              <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">品項代號</TableHead>
                      <TableHead className="font-semibold text-gray-700">品項名稱</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">採購數量</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">單價</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">小計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedItems.map((item, index) => {
                      const itemCost = item.costPerUnit || 0;
                      const itemTotal = itemCost * item.quantity;
                      return (
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
                            {po.status === '已收貨' ? (
                              <span className="font-semibold text-amber-600">
                                {item.quantity} {item.unit}
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-center border-amber-200 focus:border-amber-500"
                                />
                                <span className="text-sm text-gray-500 whitespace-nowrap">{item.unit}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {po.status === '已收貨' ? (
                              <span className="text-gray-600">
                                NT$ {Math.round(itemCost).toLocaleString()}
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-sm text-gray-500">NT$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={itemCost}
                                  onChange={(e) => handleCostPerUnitChange(index, parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right border-amber-200 focus:border-amber-500"
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-amber-600">
                              NT$ {Math.round(itemTotal).toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片式佈局 */}
              <div className="md:hidden space-y-4">
                {editedItems.map((item, index) => {
                  const itemCost = item.costPerUnit || 0;
                  const itemTotal = itemCost * item.quantity;
                  return (
                    <Card key={index} className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/70 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-2">採購數量</div>
                            {po.status === '已收貨' ? (
                              <div className="font-semibold text-amber-600">
                                {item.quantity} {item.unit}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                                  className="flex-1 text-center border-amber-200 focus:border-amber-500 h-10 text-lg"
                                />
                                <span className="text-sm text-gray-500">{item.unit}</span>
                              </div>
                            )}
                          </div>

                          <div className="bg-white/70 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-2">單價</div>
                            {po.status === '已收貨' ? (
                              <div className="font-medium text-gray-900">
                                NT$ {Math.round(itemCost).toLocaleString()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-gray-500">NT$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={itemCost}
                                  onChange={(e) => handleCostPerUnitChange(index, parseFloat(e.target.value) || 0)}
                                  className="flex-1 text-right border-amber-200 focus:border-amber-500 h-10 text-lg"
                                />
                              </div>
                            )}
                          </div>

                          <div className="col-span-2 bg-amber-100 p-3 rounded-lg text-center">
                            <div className="text-xs text-amber-700 mb-1">小計</div>
                            <div className="font-bold text-amber-800 text-lg">
                              NT$ {Math.round(itemTotal).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* 總金額顯示 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                {/* 桌面版 */}
                <div className="hidden md:flex justify-end items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      項目總額：NT$ {Math.round(editedItems.reduce((total, item) => total + ((item.costPerUnit || 0) * item.quantity), 0)).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      其他費用：NT$ {Math.round(editedAdditionalFees.reduce((total, fee) => total + (fee.amount * fee.quantity), 0)).toLocaleString()}
                    </div>
                    <div className="text-lg font-bold text-amber-600 border-t border-gray-200 pt-1">
                      總金額：NT$ {Math.round(editedItems.reduce((total, item) => total + ((item.costPerUnit || 0) * item.quantity), 0) + 
                        editedAdditionalFees.reduce((total, fee) => total + (fee.amount * fee.quantity), 0)).toLocaleString()}
                    </div>
                  </div>
                  {po.status !== '已收貨' && (
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isUpdating}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          儲存中...
                        </>
                      ) : (
                        '儲存變更'
                      )}
                    </Button>
                  )}
                </div>

                {/* 手機版 */}
                <div className="md:hidden space-y-3">
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">項目總額</span>
                        <span className="font-medium text-gray-900">
                          NT$ {Math.round(editedItems.reduce((total, item) => total + ((item.costPerUnit || 0) * item.quantity), 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">其他費用</span>
                        <span className="font-medium text-gray-900">
                          NT$ {Math.round(editedAdditionalFees.reduce((total, fee) => total + (fee.amount * fee.quantity), 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-amber-200 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-amber-800">總金額</span>
                          <span className="font-bold text-amber-800 text-lg">
                            NT$ {Math.round(editedItems.reduce((total, item) => total + ((item.costPerUnit || 0) * item.quantity), 0) + 
                              editedAdditionalFees.reduce((total, fee) => total + (fee.amount * fee.quantity), 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {po.status !== '已收貨' && (
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isUpdating}
                      className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          儲存中...
                        </>
                      ) : (
                        '儲存變更'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
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

      {/* 其他費用區域 */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Package className="h-5 w-5 text-amber-600" />
              其他費用
            </CardTitle>
            {po.status !== '已收貨' && (
              <Button
                onClick={() => setIsAddFeeDialogOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                增加其他費用
              </Button>
            )}
          </div>
          <CardDescription>運費、關稅或其他額外費用</CardDescription>
        </CardHeader>
        <CardContent>
          {editedAdditionalFees.length > 0 ? (
            <div className="space-y-3">
              {editedAdditionalFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{fee.name}</div>
                    {fee.description && (
                      <div className="text-sm text-gray-600 mt-1">{fee.description}</div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      {fee.quantity} {fee.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-amber-600">
                      NT$ {Math.round(fee.amount * fee.quantity).toLocaleString()}
                    </span>
                    {po.status !== '已收貨' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdditionalFee(fee.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              目前沒有其他費用
            </div>
          )}
        </CardContent>
      </Card>

      {/* 留言區域 */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-amber-800">
            <MessageSquare className="h-5 w-5" />
            留言記錄
            <Badge variant="secondary" className="ml-2">
              {comments.length} 則留言
            </Badge>
          </CardTitle>
          <CardDescription>採購單相關的留言和備註</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 新增留言 */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-lg border border-amber-200">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">
                新增留言
              </label>
              <Textarea
                placeholder="輸入留言內容..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mt-1 min-h-[100px] resize-none"
              />
            </div>

            {/* 圖片上傳區域 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                上傳圖片
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('purchase-image-upload')?.click()}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  選擇圖片
                </Button>
                <input
                  id="purchase-image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="text-sm text-gray-500 text-center sm:text-left">
                  可選擇多張圖片 (每張最大 2MB)
                </span>
              </div>

              {/* 已上傳的圖片預覽 */}
              {uploadedImages.length > 0 && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    已選擇的圖片 ({uploadedImages.length} 張)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={imageUrl}
                          alt={`圖片 ${index + 1}`}
                          width={96}
                          height={80}
                          className="w-full h-20 sm:h-24 object-cover rounded-lg border cursor-pointer"
                          onClick={() => {
                            // 創建圖片預覽對話框
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80';
                            modal.onclick = () => modal.remove();
                            
                            const img = document.createElement('img');
                            img.src = imageUrl;
                            img.className = 'max-w-[90vw] max-h-[90vh] object-contain rounded-lg';
                            img.onclick = (e) => e.stopPropagation();
                            
                            modal.appendChild(img);
                            document.body.appendChild(modal);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() && uploadedImages.length === 0}
              className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              新增留言
            </Button>
          </div>

          {/* 留言列表 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>尚無留言記錄</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-lg border border-amber-200 p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 truncate">{comment.createdBy}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {comment.text && (
                    <div className="mb-3 text-gray-700 whitespace-pre-wrap break-words">
                      {comment.text}
                    </div>
                  )}

                  {comment.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {comment.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={imageUrl}
                            alt={`留言圖片 ${index + 1}`}
                            width={96}
                            height={80}
                            className="w-full h-20 sm:h-24 object-cover rounded-lg border cursor-pointer"
                            onClick={() => {
                              // 創建圖片預覽對話框
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80';
                              modal.onclick = () => modal.remove();
                              
                              const img = document.createElement('img');
                              img.src = imageUrl;
                              img.className = 'max-w-[90vw] max-h-[90vh] object-contain rounded-lg';
                              img.onclick = (e) => e.stopPropagation();
                              
                              modal.appendChild(img);
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 收貨對話框 */}
      {po && <ReceiveDialog isOpen={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen} onSuccess={() => loadData(po.id)} purchaseOrder={po} />}

      {/* 增加其他費用對話框 */}
      <Dialog open={isAddFeeDialogOpen} onOpenChange={setIsAddFeeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">增加其他費用</DialogTitle>
            <DialogDescription>
              添加運費、關稅或其他額外費用項目
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">費用名稱</label>
              <Input
                placeholder="例如：運費、關稅、手續費"
                value={newFee.name}
                onChange={(e) => setNewFee(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">單價 (NT$)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newFee.amount}
                  onChange={(e) => setNewFee(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">數量</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={newFee.quantity}
                  onChange={(e) => setNewFee(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">單位</label>
              <Input
                placeholder="例如：次、件、公斤"
                value={newFee.unit}
                onChange={(e) => setNewFee(prev => ({ ...prev, unit: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">描述 (選填)</label>
              <Textarea
                placeholder="費用的詳細說明..."
                value={newFee.description || ''}
                onChange={(e) => setNewFee(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddFeeDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              取消
            </Button>
            <Button
              onClick={handleAddAdditionalFee}
              className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
            >
              添加費用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除訂單確認對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg sm:text-xl">刪除採購單</DialogTitle>
            <DialogDescription>
              此操作將永久刪除此採購單及其所有相關資料，包括：
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-sm text-red-700 space-y-1">
                <li>• 採購單基本資訊</li>
                <li>• 所有採購項目</li>
                <li>• 其他費用項目</li>
                <li>• 所有留言記錄</li>
                <li>• 所有相關圖片</li>
              </ul>
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>採購單編號：</strong> {po?.code}
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>供應商：</strong> {po?.supplierName}
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>留言數量：</strong> {comments.length} 則
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>圖片數量：</strong> {comments.flatMap(c => c.images).length} 張
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              取消
            </Button>
            <Button
              onClick={handleDeletePurchaseOrder}
              disabled={isDeleting}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  刪除中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  確認刪除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
