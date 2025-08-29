'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Building, Edit, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplierDialog, SupplierData } from '../SupplierDialog';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
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

        // 獲取創建者名稱
        let createdByName = '未知';
        if (data.createdBy) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.createdBy));
            if (userDoc.exists()) {
              const userData = userDoc.data() as any;
              createdByName = userData?.name || userData?.email || '未知';
            }
          } catch (error) {
            console.error('Failed to fetch creator name:', error);
          }
        }

        setSupplier({
          id: supplierDoc.id,
          code: data.code,
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
          address: data.address,
          website: data.website,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          createdByName,
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

      // 獲取創建者名稱
      let createdByName = '未知';
      if (data.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.createdBy));
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            createdByName = userData?.name || userData?.email || '未知';
          }
        } catch (error) {
          console.error('Failed to fetch creator name:', error);
        }
      }

      setSupplier({
        id: supplierDoc.id,
        code: data.code,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        website: data.website,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        createdByName,
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
          <p className="text-muted-foreground font-mono">{supplier.code}</p>
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

            {/* 供應商編號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">供應商編號</p>
                <p className="text-lg font-semibold text-green-800">{supplier.code}</p>
              </div>
            </div>

            {/* 聯絡人 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">聯絡人</p>
                <p className="text-lg font-semibold text-purple-800">{supplier.contactPerson || '未指定'}</p>
              </div>
            </div>

            {/* 狀態 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">狀態</p>
                <Badge className={
                  supplier.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' :
                  'bg-red-100 text-red-800 border-red-300'
                }>
                  {supplier.status === 'active' ? '啟用' : '停用'}
                </Badge>
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
                <span className="text-muted-foreground">供應商編號</span>
                <span className="font-medium">{supplier.code}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">聯絡人</span>
                <span className="font-medium">{supplier.contactPerson || '未指定'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">狀態</span>
                <Badge className={
                  supplier.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' :
                  'bg-red-100 text-red-800 border-red-300'
                }>
                  {supplier.status === 'active' ? '啟用' : '停用'}
                </Badge>
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
                <span className="text-muted-foreground">電話</span>
                <span className="font-medium">{supplier.phone || '未指定'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">電子郵件</span>
                <span className="font-medium">{supplier.email || '未指定'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">地址</span>
                <span className="font-medium">{supplier.address || '未指定'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">網站</span>
                <span className="font-medium">{supplier.website || '未指定'}</span>
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
