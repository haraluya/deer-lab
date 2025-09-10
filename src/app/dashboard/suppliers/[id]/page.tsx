'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Building, Edit, MapPin, Phone, Mail, Globe, User, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplierDialog, SupplierData } from '../SupplierDialog';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!params.id || typeof params.id !== 'string') {
        setError('供應商 ID 無效');
        setIsLoading(false);
        return;
      }

      try {
        if (!db) {
          throw new Error('Firebase 未初始化');
        }
        const supplierDoc = await getDoc(doc(db, 'suppliers', params.id));
        if (!supplierDoc.exists()) {
          setError('供應商不存在');
          setIsLoading(false);
          return;
        }

        const data = supplierDoc.data();

        // 獲取對接人員名稱
        let liaisonPersonName = '';
        if (data.liaisonPersonId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.liaisonPersonId));
            if (userDoc.exists()) {
              const userData = userDoc.data() as any;
              liaisonPersonName = userData?.name || userData?.email || '';
            }
          } catch (error) {
            console.error('Failed to fetch liaison person name:', error);
          }
        }

        setSupplier({
          id: supplierDoc.id,
          name: data.name,
          products: data.products,
          contactWindow: data.contactWindow,
          contactMethod: data.contactMethod,
          liaisonPersonId: data.liaisonPersonId,
          liaisonPersonName,
          notes: data.notes,
          createdAt: data.createdAt,
        });
      } catch (error) {
        console.error('Failed to fetch supplier:', error);
        setError('讀取供應商資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupplier();
  }, [params.id]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleSupplierUpdate = async () => {
    // 重新獲取供應商資料
    setIsLoading(true);
    try {
      if (!params.id || typeof params.id !== 'string') {
        setError('供應商 ID 無效');
        return;
      }

      if (!db) {
        throw new Error('Firebase 未初始化');
      }
      
      const supplierDoc = await getDoc(doc(db, 'suppliers', params.id));
      if (!supplierDoc.exists()) {
        setError('供應商不存在');
        return;
      }

      const data = supplierDoc.data();

      // 獲取對接人員名稱
      let liaisonPersonName = '';
      if (data.liaisonPersonId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.liaisonPersonId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            liaisonPersonName = userData?.name || userData?.email || '';
          }
        } catch (error) {
          console.error('Failed to fetch liaison person name:', error);
        }
      }

      setSupplier({
        id: supplierDoc.id,
        name: data.name,
        products: data.products,
        contactWindow: data.contactWindow,
        contactMethod: data.contactMethod,
        liaisonPersonId: data.liaisonPersonId,
        liaisonPersonName,
        notes: data.notes,
        createdAt: data.createdAt,
      });
    } catch (error) {
      console.error('Failed to refresh supplier data:', error);
      setError('重新載入供應商資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-border rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '供應商不存在'}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題區域 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()}
          className="hover:bg-primary/10 hover:border-primary/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold text-primary">
            供應商詳情
          </h1>
          <p className="text-muted-foreground font-mono">{supplier.name}</p>
        </div>
        <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="mr-2 h-4 w-4" />
          編輯供應商
        </Button>
      </div>

      {/* 供應商基本資訊卡片 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            核心資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 供應商名稱 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">供應商名稱</p>
                <p className="text-lg font-semibold text-blue-800">{supplier.name}</p>
              </div>
            </div>

            {/* 供應商品 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">供應商品</p>
                <p className="text-lg font-semibold text-green-800">{supplier.products || '未指定'}</p>
              </div>
            </div>

            {/* 聯絡窗口 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">聯絡窗口</p>
                <p className="text-lg font-semibold text-purple-800">{supplier.contactWindow || '未指定'}</p>
              </div>
            </div>

            {/* 對接人員 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">對接人員</p>
                <p className="text-lg font-semibold text-orange-800">{supplier.liaisonPersonName || '未指定'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 供應商詳細資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">供應商名稱</span>
                <span className="font-medium">{supplier.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">供應商品</span>
                <span className="font-medium">{supplier.products || '未指定'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">聯絡窗口</span>
                <span className="font-medium">{supplier.contactWindow || '未指定'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">對接人員</span>
                <span className="font-medium">{supplier.liaisonPersonName || '未指定'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 聯絡資訊 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-primary">聯絡資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">聯絡方式</span>
                <span className="font-medium">{supplier.contactMethod || '未指定'}</span>
              </div>
              {supplier.notes && (
                <div className="flex flex-col gap-2 py-2 border-b">
                  <span className="text-muted-foreground">備註</span>
                  <span className="font-medium whitespace-pre-wrap">{supplier.notes}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">建立時間</span>
                <span className="font-medium">
                  {supplier.createdAt ? new Date(supplier.createdAt.toDate()).toLocaleString('zh-TW') : '未知'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 編輯供應商對話框 */}
      {supplier && (
        <SupplierDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSupplierUpdate={handleSupplierUpdate}
          supplierData={{
            ...supplier,
          } as SupplierData}
        />
      )}
    </div>
  );
}
