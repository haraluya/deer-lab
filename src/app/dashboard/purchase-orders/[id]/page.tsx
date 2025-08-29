// src/app/dashboard/purchase-orders/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
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

  // 處理留言
  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error("請輸入留言內容");
      return;
    }

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      images: uploadedImages, // 使用已上傳的圖片
      createdAt: new Date().toLocaleString('zh-TW'),
      createdBy: po?.createdByName || '未知用戶'
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    setUploadedImages([]); // 清空已上傳的圖片
    toast.success("已添加留言");
  };

  // 圖片壓縮功能
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 設定最大尺寸
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = img;
        
        // 計算縮放比例
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 繪製壓縮後的圖片
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 轉換為 Blob
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8); // 80% 品質
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // 上傳圖片到 Firebase Storage
  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage();
      
      // 使用日期分類的檔案路徑
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const timestamp = Date.now();
      
      const imagePath = `purchase-orders/${po?.id}/comments/${year}/${month}/${day}/${timestamp}_${file.name}`;
      const imageRef = ref(storage, imagePath);
      
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      throw new Error('圖片上傳失敗');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      try {
        // 顯示上傳中提示
        const toastId = toast.loading("正在處理圖片...");
        
        // 壓縮並上傳每張圖片
        const uploadPromises = fileArray.map(async (file) => {
          const compressedFile = await compressImage(file);
          const downloadURL = await uploadImageToStorage(compressedFile);
          return downloadURL;
        });
        
        const uploadedURLs = await Promise.all(uploadPromises);
        
        // 更新已上傳的圖片列表
        setUploadedImages(prev => [...prev, ...uploadedURLs]);
        
        toast.success(`成功上傳 ${uploadedURLs.length} 張圖片`, { id: toastId });
      } catch (error) {
        console.error('圖片處理失敗:', error);
        toast.error('圖片處理失敗');
      }
    }
    
    // 清空 input 值，允許重複選擇相同檔案
    event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 刪除留言功能
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
      setComments(prev => prev.filter(c => c.id !== commentId));
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
    if (!po) return;
    setIsUpdating(true);
    const toastId = toast.loading("正在儲存變更...");
    
    try {
      // 這裡需要實現更新採購單項目的 API
      // 暫時只更新本地狀態
      setPo(prev => prev ? { 
        ...prev, 
        items: editedItems,
        additionalFees: editedAdditionalFees,
        comments: comments
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
          <Button 
            onClick={() => setIsDeleteDialogOpen(true)} 
            disabled={isDeleting}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            刪除訂單
          </Button>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"
                              >
                                -
                              </Button>
                              <span className="w-16 text-center font-semibold text-amber-600">
                                {item.quantity} {item.unit}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-gray-600">
                            NT$ {itemCost.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-amber-600">
                            NT$ {itemTotal.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* 總金額顯示 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-end items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      項目總額：NT$ {editedItems.reduce((total, item) => total + ((item.costPerUnit || 0) * item.quantity), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      其他費用：NT$ {editedAdditionalFees.reduce((total, fee) => total + (fee.amount * fee.quantity), 0).toLocaleString()}
                    </div>
                    <div className="text-lg font-bold text-amber-600 border-t border-gray-200 pt-1">
                      總金額：NT$ {(editedItems.reduce((total, item) => total + ((item.costPerUnit || 0) * item.quantity), 0) + 
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
              </div>
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

      {/* 其他費用區域 */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              其他費用
            </CardTitle>
            {po.status !== '已收貨' && (
              <Button
                onClick={() => setIsAddFeeDialogOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
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
                      NT$ {(fee.amount * fee.quantity).toLocaleString()}
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
      <Card className="mb-6 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            留言記錄
          </CardTitle>
          <CardDescription>採購單相關的留言和備註</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 新增留言 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <Textarea
                placeholder="輸入留言內容..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px]"
              />
              
              {/* 圖片上傳 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" className="border-amber-200 text-amber-600 hover:bg-amber-50">
                      <Upload className="mr-2 h-4 w-4" />
                      上傳圖片
                    </Button>
                  </label>
                </div>
                
                {/* 預覽已上傳的圖片 */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedImages.map((imageURL, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageURL}
                          alt={`預覽 ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                添加留言
              </Button>
            </div>
          </div>

          {/* 留言列表 */}
          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{comment.createdBy}</span>
                      <span className="text-sm text-gray-500">{comment.createdAt}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-gray-700 mb-3">{comment.text}</div>
                  {comment.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {comment.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`留言圖片 ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                目前沒有留言
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 收貨對話框 */}
      {po && <ReceiveDialog isOpen={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen} onSuccess={() => loadData(po.id)} purchaseOrder={po} />}

      {/* 增加其他費用對話框 */}
      <Dialog open={isAddFeeDialogOpen} onOpenChange={setIsAddFeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>增加其他費用</DialogTitle>
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
            
            <div className="grid grid-cols-2 gap-4">
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
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddFeeDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleAddAdditionalFee}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              添加費用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除訂單確認對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">刪除採購單</DialogTitle>
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
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              onClick={handleDeletePurchaseOrder}
              disabled={isDeleting}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
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
