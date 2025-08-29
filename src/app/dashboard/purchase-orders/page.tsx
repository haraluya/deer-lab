// src/app/dashboard/purchase-orders/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { toast } from 'sonner';
import { 
  MoreHorizontal, Eye, Edit, Trash2, ShoppingCart, Calendar, Building, User, Plus, 
  Search, Package, Droplets, X, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 定義從 Firestore 讀取並處理後的採購單資料結構
interface PurchaseOrderView {
  id: string;
  code: string;
  supplierName: string;
  status: '預報單' | '已訂購' | '已收貨' | '已取消';
  createdByName: string;
  createdAt: string;
  totalAmount?: number;
}

// 採購車項目介面
interface CartItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  supplierId: string;
  supplierName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
}

// 供應商分組的採購車
interface SupplierCartGroup {
  supplierId: string;
  supplierName: string;
  items: CartItem[];
}

// 搜尋結果項目
interface SearchResult {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance' | 'supplier';
  supplierId: string;
  supplierName: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
}

function PurchaseOrdersPageContent() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderView[]>([]);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState<PurchaseOrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 採購清單相關狀態
  const [statusFilter, setStatusFilter] = useState<'all' | '預報單' | '已訂購' | '已收貨'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // 搜尋相關狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [materials, setMaterials] = useState<SearchResult[]>([]);
  const [fragrances, setFragrances] = useState<SearchResult[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [searchType, setSearchType] = useState<'items' | 'suppliers'>('items');
  
  // 採購車相關狀態
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCartItems, setSelectedCartItems] = useState<Set<string>>(new Set());
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // 載入採購單資料
  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      // 預先載入所有供應商和使用者資料
      const suppliersMap = new Map<string, string>();
      const usersMap = new Map<string, string>();
      
      const supplierSnapshot = await getDocs(collection(db, "suppliers"));
      supplierSnapshot.forEach(doc => suppliersMap.set(doc.id, doc.data().name));
      
      const userSnapshot = await getDocs(collection(db, "users"));
      userSnapshot.forEach(doc => usersMap.set(doc.id, doc.data().name));

      // 獲取所有採購單資料
      const poSnapshot = await getDocs(collection(db, 'purchaseOrders'));
      
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

      setPurchaseOrders(poList.sort((a, b) => b.code.localeCompare(a.code)));

    } catch (error) {
      console.error("讀取採購單資料失敗:", error);
      toast.error("讀取採購單資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 載入物料、香精和供應商資料
  const loadItems = useCallback(async () => {
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      // 載入供應商
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersList = suppliersSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setSuppliers(suppliersList);
      
      const suppliersMap = new Map<string, string>();
      suppliersSnapshot.forEach(doc => suppliersMap.set(doc.id, doc.data().name));
      
      // 載入物料
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      const materialsList = materialsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          type: 'material' as const,
          supplierId: data.supplierRef?.id || '',
          supplierName: data.supplierRef?.id ? suppliersMap.get(data.supplierRef.id) || '未知供應商' : '未指定',
          unit: data.unit || '',
          costPerUnit: data.costPerUnit || 0,
          currentStock: data.currentStock || 0,
        };
      });

      // 載入香精
      const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'));
      const fragrancesList = fragrancesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          type: 'fragrance' as const,
          supplierId: data.supplierRef?.id || '',
          supplierName: data.supplierRef?.id ? suppliersMap.get(data.supplierRef.id) || '未知供應商' : '未指定',
          unit: data.unit || 'KG',
          costPerUnit: data.costPerUnit || 0,
          currentStock: data.currentStock || 0,
        };
      });

      setMaterials(materialsList);
      setFragrances(fragrancesList);

    } catch (error) {
      console.error("載入物料和香精資料失敗:", error);
      toast.error("載入物料和香精資料失敗。");
    }
  }, []);

  // 從 localStorage 載入採購車
  const loadCartFromStorage = useCallback(() => {
    try {
      const savedCart = localStorage.getItem('purchaseCart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("載入採購車失敗:", error);
    }
  }, []);

  // 保存採購車到 localStorage
  const saveCartToStorage = useCallback((items: CartItem[]) => {
    try {
      localStorage.setItem('purchaseCart', JSON.stringify(items));
      // 觸發自定義事件，通知其他組件採購車已更新
      window.dispatchEvent(new CustomEvent('purchaseCartUpdated'));
    } catch (error) {
      console.error("保存採購車失敗:", error);
    }
  }, []);

  // 搜尋功能
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchType === 'suppliers') {
      // 搜尋供應商
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(term.toLowerCase())
      );
      
      // 依照名稱排序
      const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
      setSearchResults(sorted.slice(0, 10).map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        code: '',
        type: 'supplier' as const,
        supplierId: supplier.id,
        supplierName: supplier.name,
        unit: '',
        costPerUnit: 0,
        currentStock: 0,
      })));
    } else {
      // 搜尋物料和香精
      const allItems = [...materials, ...fragrances];
      const filtered = allItems.filter(item =>
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.code.toLowerCase().includes(term.toLowerCase()) ||
        item.supplierName.toLowerCase().includes(term.toLowerCase())
      );
      
      // 依照名稱排序
      const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
      setSearchResults(sorted.slice(0, 10)); // 限制搜尋結果數量
    }
  }, [materials, fragrances, suppliers, searchType]);

  // 添加項目到採購車
  const addToCart = useCallback((item: SearchResult) => {
    // 如果是供應商，不直接加入採購車，而是顯示該供應商的所有物料和香精
    if (item.type === 'supplier') {
      const supplierItems = [...materials, ...fragrances].filter(
        material => material.supplierId === item.supplierId
      );
      
      if (supplierItems.length > 0) {
        setSearchResults(supplierItems.slice(0, 10));
        setSearchType('items');
        toast.success(`顯示 ${item.name} 供應商的所有項目`);
        return;
      } else {
        toast.info(`供應商 ${item.name} 目前沒有物料或香精`);
        return;
      }
    }

    // 確保只有物料和香精類型才能加入採購車
    if (item.type !== 'material' && item.type !== 'fragrance') {
      return;
    }

    const existingItem = cartItems.find(cartItem => 
      cartItem.id === item.id && cartItem.type === item.type
    );

    if (existingItem) {
      // 如果已存在，增加數量
      const updatedItems = cartItems.map(cartItem =>
        cartItem.id === item.id && cartItem.type === item.type
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
      setCartItems(updatedItems);
      saveCartToStorage(updatedItems);
      toast.success(`已增加 ${item.name} 的數量`);
    } else {
      // 新增項目 - 使用類型斷言來創建 CartItem
      const newCartItem = {
        id: item.id,
        name: item.name,
        code: item.code,
        type: item.type as 'material' | 'fragrance',
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        quantity: 1,
      } as CartItem;
      
      const updatedItems = [...cartItems, newCartItem];
      setCartItems(updatedItems);
      saveCartToStorage(updatedItems);
      toast.success(`已將 ${item.name} 加入採購車`);
    }
    
    // 不清空搜尋結果，讓用戶可以繼續搜尋和加入
    // setSearchTerm('');
    // setSearchResults([]);
  }, [cartItems, saveCartToStorage, materials, fragrances]);

  // 從採購車移除項目
  const removeFromCart = useCallback((itemId: string, type: 'material' | 'fragrance') => {
    const updatedItems = cartItems.filter(item => 
      !(item.id === itemId && item.type === type)
    );
    setCartItems(updatedItems);
    saveCartToStorage(updatedItems);
    toast.success("已從採購車移除");
  }, [cartItems, saveCartToStorage]);

  // 更新採購車項目數量
  const updateCartItemQuantity = useCallback((itemId: string, type: 'material' | 'fragrance', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, type);
      return;
    }

    const updatedItems = cartItems.map(item =>
      item.id === itemId && item.type === type
        ? { ...item, quantity }
        : item
    );
    setCartItems(updatedItems);
    saveCartToStorage(updatedItems);
  }, [cartItems, removeFromCart, saveCartToStorage]);

  // 切換採購車項目選擇狀態
  const toggleCartItemSelection = useCallback((itemId: string, type: 'material' | 'fragrance') => {
    const key = `${itemId}-${type}`;
    setSelectedCartItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // 切換供應商全選狀態
  const toggleSupplierSelection = useCallback((supplierId: string) => {
    const supplierItems = cartItems.filter(item => item.supplierId === supplierId);
    const supplierItemKeys = supplierItems.map(item => `${item.id}-${item.type}`);
    
    setSelectedCartItems(prev => {
      const newSet = new Set(prev);
      const allSelected = supplierItemKeys.every(key => newSet.has(key));
      
      if (allSelected) {
        // 如果全部已選中，則取消選中
        supplierItemKeys.forEach(key => newSet.delete(key));
      } else {
        // 如果有未選中的，則全部選中
        supplierItemKeys.forEach(key => newSet.add(key));
      }
      
      return newSet;
    });
  }, [cartItems]);

  // 顯示確認對話框
  const showConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  // 建立採購單
  const createPurchaseOrder = useCallback(async () => {
    setIsCreatingOrder(true);
    const toastId = toast.loading("正在建立採購單...");

    try {
      const functions = getFunctions();
      const createPurchaseOrdersFunction = httpsCallable(functions, 'createPurchaseOrders');

      // 決定要建立採購單的項目
      let itemsToProcess: CartItem[];
      if (selectedCartItems.size === 0) {
        // 沒有勾選任何項目，建立所有項目
        itemsToProcess = cartItems;
      } else {
        // 只建立勾選的項目
        itemsToProcess = cartItems.filter(item => 
          selectedCartItems.has(`${item.id}-${item.type}`)
        );
      }

      if (itemsToProcess.length === 0) {
        toast.error("沒有項目可以建立採購單", { id: toastId });
        return;
      }

      // 按供應商分組
      const supplierGroups = itemsToProcess.reduce((groups, item) => {
        if (!groups[item.supplierId]) {
          groups[item.supplierId] = {
            supplierId: item.supplierId,
            items: []
          };
        }
        groups[item.supplierId].items.push({
          id: item.id,
          name: item.name,
          code: item.code,
          quantity: item.quantity,
          unit: item.unit,
          itemRefPath: `${item.type === 'material' ? 'materials' : 'fragrances'}/${item.id}`
        });
        return groups;
      }, {} as Record<string, any>);

      const payload = {
        suppliers: Object.values(supplierGroups)
      };

      await createPurchaseOrdersFunction(payload);
      
      toast.success(`成功建立 ${Object.keys(supplierGroups).length} 張採購單`, { id: toastId });
      
      // 從採購車中移除已使用的項目
      const remainingItems = cartItems.filter(item => 
        !itemsToProcess.some(processedItem => 
          processedItem.id === item.id && processedItem.type === item.type
        )
      );
      setCartItems(remainingItems);
      saveCartToStorage(remainingItems);
      setSelectedCartItems(new Set());
      setIsConfirmDialogOpen(false);
      
      // 重新載入採購單列表
      loadPurchaseOrders();
      
    } catch (error) {
      console.error("建立採購單失敗:", error);
      toast.error("建立採購單失敗", { id: toastId });
    } finally {
      setIsCreatingOrder(false);
    }
  }, [selectedCartItems, cartItems, loadPurchaseOrders, saveCartToStorage]);





  // 計算分頁
  const paginatedPurchaseOrders = useMemo(() => {
    const filtered = statusFilter === 'all' 
      ? purchaseOrders 
      : purchaseOrders.filter(po => po.status === statusFilter);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [purchaseOrders, statusFilter, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    const filtered = statusFilter === 'all' 
      ? purchaseOrders 
      : purchaseOrders.filter(po => po.status === statusFilter);
    return Math.ceil(filtered.length / itemsPerPage);
  }, [purchaseOrders, statusFilter, itemsPerPage]);

  // 按供應商分組採購車
  const cartBySupplier = useMemo(() => {
    const groups: Record<string, SupplierCartGroup> = {};
    
    cartItems.forEach(item => {
      if (!groups[item.supplierId]) {
        groups[item.supplierId] = {
          supplierId: item.supplierId,
          supplierName: item.supplierName || '未指定供應商',
          items: []
        };
      }
      groups[item.supplierId].items.push(item);
    });

    return Object.values(groups);
  }, [cartItems]);

  // 計算總金額
  const totalAmount = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.costPerUnit * item.quantity), 0);
  }, [cartItems]);

  useEffect(() => {
    loadPurchaseOrders();
    loadItems();
    loadCartFromStorage();
  }, [loadPurchaseOrders, loadItems, loadCartFromStorage]);

  // 篩選採購單
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  return (
    <div className="container mx-auto py-10 purchase-orders-page">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          採購管理
        </h1>
        <p className="text-gray-600 mt-2">管理採購訂單與供應商交易</p>
      </div>

      {/* 1. 採購清單區域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              <CardTitle>採購清單</CardTitle>
            </div>
            <div className="text-sm text-gray-600">
              共 {purchaseOrders.length} 張採購單
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 狀態篩選 */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">狀態篩選：</span>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              全部
            </Button>
            <Button
              variant={statusFilter === '預報單' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('預報單')}
              className={statusFilter === '預報單' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 text-purple-600 hover:bg-purple-50'}
            >
              預報單
            </Button>
            <Button
              variant={statusFilter === '已訂購' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('已訂購')}
              className={statusFilter === '已訂購' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-600 hover:bg-green-50'}
            >
              已訂購
            </Button>
            <Button
              variant={statusFilter === '已收貨' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('已收貨')}
              className={statusFilter === '已收貨' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}
            >
              已入庫
            </Button>
          </div>

          {/* 採購單表格 */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>採購單資訊</TableHead>
                  <TableHead>供應商</TableHead>
                                      <TableHead>建立人員</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>採購金額</TableHead>
                    <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                                          <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin mr-2"></div>
                          載入中...
                        </div>
                      </TableCell>
                  </TableRow>
                ) : paginatedPurchaseOrders.length > 0 ? (
                  paginatedPurchaseOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="hover:bg-amber-50/50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/purchase-orders/${order.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{order.code}</div>
                            <div className="text-xs text-gray-500">ID: {order.id}</div>
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
                                               <Badge className={`${
                         order.status === '預報單' ? 'bg-purple-100 text-purple-800' : 
                         order.status === '已訂購' ? 'bg-green-100 text-green-800' : 
                         order.status === '已收貨' ? 'bg-gray-600 text-white' : 
                         order.status === '已取消' ? 'bg-red-100 text-red-800' : 
                         'bg-gray-600 text-white'
                       }`}>
                         {order.status}
                       </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-amber-600">
                            NT$ {order.totalAmount ? order.totalAmount.toLocaleString() : '0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/purchase-orders/${order.id}`)}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-gray-500">
                        {statusFilter === 'all' ? '沒有採購單資料' : `沒有${statusFilter}狀態的採購單`}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分頁控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                第 {currentPage} 頁，共 {totalPages} 頁
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 搜尋欄區域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-600" />
              <CardTitle>搜尋物料與香精</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={searchType === 'items' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSearchType('items');
                  setSearchResults([]);
                  setSearchTerm('');
                }}
                className={searchType === 'items' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}
              >
                物料/香精
              </Button>
              <Button
                variant={searchType === 'suppliers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSearchType('suppliers');
                  setSearchResults([]);
                  setSearchTerm('');
                }}
                className={searchType === 'suppliers' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}
              >
                供應商
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchType === 'suppliers' ? "輸入供應商名稱搜尋..." : "輸入物料名稱、代號、香精名稱或供應商名稱搜尋..."}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-3 border-amber-200 focus:border-amber-500 focus:ring-amber-500"
            />
            {searchResults.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchResults([]);
                  setSearchTerm('');
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 搜尋結果 */}
          {searchResults.length > 0 && (
            <div className="mt-4 border border-amber-200 rounded-lg overflow-hidden">
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">
                    搜尋結果 ({searchResults.length})
                  </span>
                  <span className="text-xs text-amber-600">
                    {searchType === 'suppliers' ? '供應商搜尋' : '物料/香精搜尋'}
                  </span>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={`${item.id}-${item.type}`}
                    className="flex items-center justify-between p-3 hover:bg-amber-50/50 border-b border-amber-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.type === 'material' 
                          ? 'bg-blue-100 text-blue-600' 
                          : item.type === 'fragrance'
                          ? 'bg-pink-100 text-pink-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {item.type === 'material' ? <Package className="h-4 w-4" /> : 
                         item.type === 'fragrance' ? <Droplets className="h-4 w-4" /> :
                         <Building className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.type === 'supplier' ? (
                            '供應商'
                          ) : (
                            `${item.code} • ${item.supplierName} • 庫存: ${item.currentStock} ${item.unit}`
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToCart(item)}
                      className={item.type === 'supplier' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                    >
                      {item.type === 'supplier' ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          查看項目
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          加入採購車
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. 採購車區域 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              <CardTitle>採購車</CardTitle>
              <span className="text-sm text-gray-500">
                ({cartItems.length} 個項目，總計 NT$ {totalAmount.toLocaleString()})
              </span>
            </div>
            {cartItems.length > 0 && (
              <Button
                onClick={showConfirmDialog}
                disabled={isCreatingOrder}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                建立採購單
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>採購車是空的</p>
              <p className="text-sm">使用上方的搜尋欄來添加物料或香精</p>
            </div>
          ) : (
            <div className="space-y-6">
              {cartBySupplier.map((supplierGroup) => (
                <div key={supplierGroup.supplierId} className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={supplierGroup.items.every(item => 
                          selectedCartItems.has(`${item.id}-${item.type}`)
                        )}
                        onCheckedChange={() => toggleSupplierSelection(supplierGroup.supplierId)}
                        className="border-amber-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                      />
                      <Building className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-amber-800">
                        {supplierGroup.supplierName}
                      </span>
                      <span className="text-sm text-amber-600">
                        ({supplierGroup.items.length} 項)
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {supplierGroup.items.map((item) => (
                      <div key={`${item.id}-${item.type}`} className="p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedCartItems.has(`${item.id}-${item.type}`)}
                            onCheckedChange={() => toggleCartItemSelection(item.id, item.type)}
                            className="border-amber-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          />
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.type === 'material' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-pink-100 text-pink-600'
                          }`}>
                            {item.type === 'material' ? <Package className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              {item.code} • NT$ {item.costPerUnit.toLocaleString()}/{item.unit}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(item.id, item.type, item.quantity - 1)}
                                className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  updateCartItemQuantity(item.id, item.type, newQuantity);
                                }}
                                className="w-16 h-8 text-center text-sm border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                              />
                              <span className="text-sm text-gray-500">{item.unit}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(item.id, item.type, item.quantity + 1)}
                                className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50"
                              >
                                +
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id, item.type)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 確認建立採購單對話框 */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>確認建立採購單</DialogTitle>
            <DialogDescription>
              請確認以下項目將建立採購單
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-60 overflow-y-auto space-y-3">
            {(() => {
              // 決定要顯示的項目
              const itemsToShow = selectedCartItems.size === 0 
                ? cartItems 
                : cartItems.filter(item => selectedCartItems.has(`${item.id}-${item.type}`));
              
              // 按供應商分組
              const supplierGroups = itemsToShow.reduce((groups, item) => {
                if (!groups[item.supplierId]) {
                  groups[item.supplierId] = {
                    supplierName: item.supplierName,
                    items: []
                  };
                }
                groups[item.supplierId].items.push(item);
                return groups;
              }, {} as Record<string, any>);

              return (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    將建立 <span className="font-semibold text-amber-600">{Object.keys(supplierGroups).length}</span> 張採購單
                  </div>
                  
                  {Object.entries(supplierGroups).map(([supplierId, group]) => (
                    <div key={supplierId} className="border border-amber-200 rounded-lg overflow-hidden">
                      <div className="bg-amber-50 px-3 py-2 border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-amber-800">
                            {group.supplierName}
                          </span>
                          <span className="text-sm text-amber-600">
                            ({group.items.length} 項)
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-amber-100">
                        {group.items.map((item: any) => (
                          <div key={`${item.id}-${item.type}`} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                  item.type === 'material' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'bg-pink-100 text-pink-600'
                                }`}>
                                  {item.type === 'material' ? <Package className="h-3 w-3" /> : <Droplets className="h-3 w-3" />}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {item.code} • NT$ {item.costPerUnit.toLocaleString()}/{item.unit}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">
                                  {item.quantity} {item.unit}
                                </div>
                                <div className="text-sm text-gray-500">
                                  NT$ {(item.costPerUnit * item.quantity).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isCreatingOrder}
            >
              取消
            </Button>
            <Button
              onClick={createPurchaseOrder}
              disabled={isCreatingOrder}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isCreatingOrder ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  建立中...
                </>
              ) : (
                '確認建立採購單'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <PurchaseOrdersPageContent />
  );
}
