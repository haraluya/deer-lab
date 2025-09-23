// src/app/dashboard/purchase-orders/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiForm } from '@/hooks/useApiClient';
import { CartItem } from '@/types';
import { useGlobalCart } from '@/hooks/useGlobalCart';

import { toast } from 'sonner';
import {
  MoreHorizontal, Eye, Edit, Trash2, ShoppingCart, Calendar, Building, User, Plus,
  Search, Package, Droplets, X, ChevronLeft, ChevronRight, Filter, Shield, RefreshCw, AlertCircle, CheckCircle, Clock, DollarSign, Save, Ban
} from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { BUSINESS_CONFIG } from '@/config/business';
import { formatQuantity } from '@/utils/numberFormat';

// 引入統一架構組件
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';
import { useDataSearch } from '@/hooks/useDataSearch';

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


// 供應商分組的採購車 - 包含豐富的項目資料
interface SupplierCartGroup {
  supplierId: string;
  supplierName: string;
  items: any[]; // 豐富的項目資料，包含從原料/香精查詢到的詳細資訊
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
  // 新增欄位
  category?: string;
  subCategory?: string;
  series?: string;
  usedInProducts?: string[];
}

// 採購單狀態Badge組件
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "預報單":
        return {
          className: "bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border border-purple-200 shadow-sm",
          icon: "⏳"
        }
      case "已訂購":
        return {
          className: "bg-gradient-to-r from-green-200 to-green-300 text-green-800 border border-green-200 shadow-sm",
          icon: "📋"
        }
      case "已收貨":
        return {
          className: "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 border border-gray-200 shadow-sm",
          icon: "📦"
        }
      case "已取消":
        return {
          className: "bg-gradient-to-r from-red-200 to-red-300 text-red-800 border border-red-200 shadow-sm",
          icon: "❌"
        }
      default:
        return {
          className: "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 border border-gray-200 shadow-sm",
          icon: "❓"
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge className={`${config.className} font-semibold px-3 py-1.5 rounded-full text-sm transition-all duration-200 hover:scale-105`}>
      <span className="mr-1.5">{config.icon}</span>
      {status}
    </Badge>
  )
}

function PurchaseOrdersPageContent() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 使用統一的搜尋過濾 Hook
  const searchConfig = {
    searchFields: [
      { key: 'code' as keyof PurchaseOrderView },
      { key: 'supplierName' as keyof PurchaseOrderView },
      { key: 'createdByName' as keyof PurchaseOrderView }
    ],
    filterConfigs: [
      {
        key: 'status' as keyof PurchaseOrderView,
        type: 'set' as const
      }
    ]
  };

  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredPurchaseOrders,
    totalCount,
    filteredCount
  } = useDataSearch(purchaseOrders, searchConfig);

  // 計算統計數據
  const stats: StandardStats[] = useMemo(() => {
    const forecast = purchaseOrders.filter(po => po.status === '預報單').length
    const ordered = purchaseOrders.filter(po => po.status === '已訂購').length
    const received = purchaseOrders.filter(po => po.status === '已收貨').length
    const cancelled = purchaseOrders.filter(po => po.status === '已取消').length

    // 計算本月已採購金額（根據採購單建立日期，包含所有狀態）
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyPurchaseAmount = purchaseOrders
      .filter(po => {
        // 檢查採購單日期是否在本月（所有狀態都算，包括預報單）
        try {
          const orderMonth = new Date(po.createdAt).toISOString().slice(0, 7);
          return orderMonth === currentMonth;
        } catch {
          return false;
        }
      })
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    return [
      {
        title: '預報單',
        value: forecast,
        subtitle: '待訂購',
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'purple'
      },
      {
        title: '已訂購',
        value: ordered,
        subtitle: '進行中',
        icon: <Clock className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '已收貨',
        value: received,
        subtitle: '已完成',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '本月提交金額',
        value: `$${Math.round(monthlyPurchaseAmount).toLocaleString()}`,
        subtitle: '本月所有採購單',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'orange'
      }
    ];
  }, [purchaseOrders]);

  // 配置欄位
  const columns: StandardColumn<PurchaseOrderView>[] = [
    {
      key: 'code',
      title: '採購單資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{record.code}</div>
            <div className="text-sm text-gray-500">{record.createdAt}</div>
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.code}</div>
          <div className="text-xs text-gray-500">{record.createdAt}</div>
        </div>
      )
    },
    {
      key: 'supplierName',
      title: '供應商',
      sortable: true,
      searchable: true,
      priority: 4,
      render: (value, record) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">{record.supplierName}</span>
        </div>
      )
    },
    {
      key: 'createdByName',
      title: '建立人員',
      sortable: true,
      searchable: true,
      priority: 3,
      hideOnMobile: true,
      render: (value, record) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{record.createdByName}</span>
        </div>
      )
    },
    {
      key: 'status',
      title: '狀態',
      sortable: true,
      filterable: true,
      priority: 4,
      align: 'center',
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'totalAmount',
      title: '採購金額',
      sortable: true,
      priority: 3,
      align: 'right',
      render: (value) => (
        <div className="text-sm font-semibold text-amber-600">
          NT$ {value ? Math.round(value).toLocaleString() : '0'}
        </div>
      ),
      hideOnMobile: true
    }
  ];

  // 配置操作
  const actions: StandardAction<PurchaseOrderView>[] = [
    {
      key: 'view',
      title: '查看詳情',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => router.push(`/dashboard/purchase-orders/${record.id}`)
    }
  ];

  // 配置快速篩選
  const quickFilters: QuickFilter[] = [
    {
      key: 'status',
      label: '預報單',
      value: '預報單',
      color: 'purple',
      count: purchaseOrders.filter(po => po.status === '預報單').length
    },
    {
      key: 'status',
      label: '已訂購',
      value: '已訂購',
      color: 'green',
      count: purchaseOrders.filter(po => po.status === '已訂購').length
    },
    {
      key: 'status',
      label: '已收貨',
      value: '已收貨',
      color: 'blue',
      count: purchaseOrders.filter(po => po.status === '已收貨').length
    }
  ];
  
  // 搜尋相關狀態（保留用於物料香精搜尋）
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [materials, setMaterials] = useState<SearchResult[]>([]);
  const [fragrances, setFragrances] = useState<SearchResult[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [searchType, setSearchType] = useState<'items' | 'suppliers'>('items');
  
  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewPurchase = hasPermission('purchase.view') || hasPermission('purchase:view');
  const canManagePurchase = hasPermission('purchase.manage') || hasPermission('purchase:manage') || hasPermission('purchase:create') || hasPermission('purchase:edit');
  
  // 採購車相關狀態 - 使用全域購物車
  const { 
    cartItems, 
    cartItemCount,
    addToCart: globalAddToCart, 
    removeFromCart: globalRemoveFromCart, 
    updateCartItem: globalUpdateCartItem,
    clearCart: globalClearCart,
    isSyncing 
  } = useGlobalCart();
  const apiClient = useApiForm();
  const [selectedCartItems, setSelectedCartItems] = useState<Set<string>>(new Set());
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [itemDetailDialog, setItemDetailDialog] = useState<{open: boolean, item: any | null}>({open: false, item: null});
  // 可做產品數量編輯狀態
  const [editingProductCapacity, setEditingProductCapacity] = useState<Set<string>>(new Set());
  const [tempProductCapacity, setTempProductCapacity] = useState<Map<string, number>>(new Map());

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

        // 計算採購單總金額
        const items = data.items || [];
        const additionalFees = data.additionalFees || [];
        
        const itemsTotal = items.reduce((total: number, item: any) => {
          const itemCost = item.costPerUnit || 0;
          const itemQuantity = item.quantity || 0;
          return total + (itemCost * itemQuantity);
        }, 0);
        
        const feesTotal = additionalFees.reduce((total: number, fee: any) => {
          const feeAmount = fee.amount || 0;
          const feeQuantity = fee.quantity || 1;
          return total + (feeAmount * feeQuantity);
        }, 0);
        
        const totalAmount = itemsTotal + feesTotal;

        return {
          id: doc.id,
          code: data.code,
          supplierName: suppliersMap.get(data.supplierRef?.id) || '未知供應商',
          status: data.status,
          createdByName: usersMap.get(data.createdByRef?.id) || '未知人員',
          createdAt: createdAt,
          totalAmount: totalAmount,
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

  // 🚀 按需載入模式：只載入購物車內項目的對應資料
  const loadItems = useCallback(async () => {
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }

      // 🚀 按需載入：只處理購物車中實際存在的項目
      if (cartItems.length === 0) {
        console.log('📝 購物車為空，跳過資料載入');
        setMaterials([]);
        setFragrances([]);
        setSuppliers([]);
        return;
      }

      console.log(`🎯 按需載入：處理 ${cartItems.length} 個購物車項目`);

      // 分析購物車中的項目類型和代碼
      const materialCodes = cartItems.filter(item => item.type === 'material').map(item => item.code);
      const fragranceCodes = cartItems.filter(item => item.type === 'fragrance').map(item => item.code);

      console.log(`📦 需要載入原料: ${materialCodes.length} 個`, materialCodes);
      console.log(`🌸 需要載入香精: ${fragranceCodes.length} 個`, fragranceCodes);

      // 用於收集需要載入的關聯資料ID
      const neededSupplierIds = new Set<string>();
      const neededFragranceIds = new Set<string>();
      const neededSeriesIds = new Set<string>();

      // 📦 第一步：載入購物車中的原料資料，收集關聯ID
      let materialsData: any[] = [];
      if (materialCodes.length > 0) {
        const materialsSnapshot = await getDocs(
          query(collection(db, 'materials'), where('code', 'in', materialCodes))
        );

        materialsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          materialsData.push({ id: doc.id, ...data });

          // 收集需要的供應商 ID - 支援多種資料格式
          // 注意：原料分類是直接以字串儲存，不需要額外查詢
          if (data.supplierId) neededSupplierIds.add(data.supplierId);
          if (data.supplierRef?.id) neededSupplierIds.add(data.supplierRef.id);
        });
        console.log(`📦 載入了 ${materialsSnapshot.docs.length} 個原料`);
      }

      // 🌸 第二步：載入購物車中的香精資料，收集關聯ID
      let fragrancesData: any[] = [];
      if (fragranceCodes.length > 0) {
        const fragrancesSnapshot = await getDocs(
          query(collection(db, 'fragrances'), where('code', 'in', fragranceCodes))
        );

        fragrancesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          fragrancesData.push({ id: doc.id, ...data });

          // 收集需要的供應商 ID 和香精 ID - 支援多種資料格式
          if (data.supplierId) neededSupplierIds.add(data.supplierId);
          if (data.supplierRef?.id) neededSupplierIds.add(data.supplierRef.id);
          neededFragranceIds.add(doc.id); // 用於查找使用產品
        });
        console.log(`🌸 載入了 ${fragrancesSnapshot.docs.length} 個香精`);
      }

      // 🏪 第三步：載入需要的供應商資料
      const suppliersMap = new Map<string, string>();
      if (neededSupplierIds.size > 0) {
        const suppliersSnapshot = await getDocs(
          query(collection(db, 'suppliers'), where('__name__', 'in', Array.from(neededSupplierIds)))
        );
        suppliersSnapshot.forEach(doc => {
          suppliersMap.set(doc.id, doc.data().name);
        });
        console.log(`🏪 載入了 ${suppliersSnapshot.docs.length} 個供應商`);
      }

      // 📁 第四步：分類資料處理（原料分類直接以字串儲存，跳過此步驟）
      console.log(`📁 原料分類以直接字串儲存，無需額外查詢`);

      // 🎯 第五步：載入香精相關的產品資料（只查詢使用了這些香精的產品）
      const productsMap = new Map<string, string[]>();
      if (neededFragranceIds.size > 0) {
        console.log(`🔍 開始查詢使用香精的產品，香精ID:`, Array.from(neededFragranceIds));

        // 嘗試不同的查詢方式來找到使用香精的產品
        const productsSnapshot = await getDocs(collection(db, 'products'));

        console.log(`📋 載入了 ${productsSnapshot.docs.length} 個產品進行篩選`);

        // 收集需要的產品系列 ID 和香精映射
        const validProducts: any[] = [];

        productsSnapshot.docs.forEach(doc => {
          const productData = doc.data();
          const fragranceRefId = productData.currentFragranceRef?.id;

          if (fragranceRefId && neededFragranceIds.has(fragranceRefId)) {
            console.log(`✅ 找到使用香精 ${fragranceRefId} 的產品: ${productData.name}`);
            validProducts.push({ id: doc.id, ...productData });
            if (productData.seriesRef?.id) neededSeriesIds.add(productData.seriesRef.id);
          }
        });

        console.log(`🎯 篩選出 ${validProducts.length} 個使用目標香精的產品`);

        // 載入需要的產品系列
        const seriesMap = new Map<string, string>();
        if (neededSeriesIds.size > 0) {
          const seriesSnapshot = await getDocs(
            query(collection(db, 'productSeries'), where('__name__', 'in', Array.from(neededSeriesIds)))
          );
          seriesSnapshot.forEach(doc => {
            seriesMap.set(doc.id, doc.data().name);
          });
          console.log(`📁 載入了 ${seriesSnapshot.docs.length} 個產品系列`);
        }

        // 組合產品名稱並建立香精→產品的映射
        validProducts.forEach(productData => {
          const productName = productData.name;
          const seriesName = seriesMap.get(productData.seriesRef?.id);
          const displayName = seriesName ? `${seriesName} - ${productName}` : productName;

          if (productData.currentFragranceRef?.id) {
            const fragranceId = productData.currentFragranceRef.id;
            if (!productsMap.has(fragranceId)) {
              productsMap.set(fragranceId, []);
            }
            productsMap.get(fragranceId)?.push(displayName);
            console.log(`🔗 香精 ${fragranceId} 添加產品: ${displayName}`);
          }
        });

        console.log(`🎯 最終香精→產品映射:`, Object.fromEntries(productsMap));
      }

      // 📝 第六步：組合最終的原料資料
      const materialsList = materialsData.map(data => {
        // 🔍 原料分類處理（與原料頁面保持一致）
        // 原料分類是以直接字串儲存，不是引用
        const categoryName = data.category || '未分類';
        const subCategoryName = data.subCategory || '';

        console.log(`📦 處理原料 ${data.name}:`, {
          原始category: data.category,
          原始subCategory: data.subCategory,
          處理後categoryName: categoryName,
          處理後subCategoryName: subCategoryName
        });

        // 🔍 多層級供應商資料處理（與原料頁面保持一致）
        let supplierName = '未指定';
        let supplierId = '';

        if (data.supplierName && data.supplierName.trim() !== '') {
          supplierName = data.supplierName.trim();
          supplierId = data.supplierId || data.supplierRef?.id || '';
        } else if (data.supplierId && suppliersMap.has(data.supplierId)) {
          supplierName = suppliersMap.get(data.supplierId)!;
          supplierId = data.supplierId;
        } else if (data.supplierRef?.id && suppliersMap.has(data.supplierRef.id)) {
          supplierName = suppliersMap.get(data.supplierRef.id)!;
          supplierId = data.supplierRef.id;
        } else if (data.supplier && typeof data.supplier === 'string') {
          supplierName = data.supplier;
        }

        return {
          id: data.id,
          name: data.name,
          code: data.code,
          type: 'material' as const,
          supplierId,
          supplierName,
          unit: data.unit || '',
          costPerUnit: data.costPerUnit || 0,
          currentStock: data.currentStock || 0,
          category: categoryName,
          subCategory: subCategoryName,
        };
      });

      // 🌸 第七步：組合最終的香精資料
      const fragrancesList = fragrancesData.map(data => {
        // 🔍 多層級供應商資料處理（與原料頁面保持一致）
        let supplierName = '未指定';
        let supplierId = '';

        if (data.supplierName && data.supplierName.trim() !== '') {
          supplierName = data.supplierName.trim();
          supplierId = data.supplierId || data.supplierRef?.id || '';
        } else if (data.supplierId && suppliersMap.has(data.supplierId)) {
          supplierName = suppliersMap.get(data.supplierId)!;
          supplierId = data.supplierId;
        } else if (data.supplierRef?.id && suppliersMap.has(data.supplierRef.id)) {
          supplierName = suppliersMap.get(data.supplierRef.id)!;
          supplierId = data.supplierRef.id;
        } else if (data.supplier && typeof data.supplier === 'string') {
          supplierName = data.supplier;
        }

        return {
          id: data.id,
          name: data.name,
          code: data.code,
          type: 'fragrance' as const,
          supplierId,
          supplierName,
          unit: data.unit || 'KG',
          costPerUnit: data.costPerUnit || 0,
          currentStock: data.currentStock || 0,
          category: data.category || '',
          series: data.series || '',
          usedInProducts: productsMap.get(data.id) || [],
          percentage: data.percentage || 0, // 香精比例
          pgRatio: data.pgRatio || 0, // PG比例
          vgRatio: data.vgRatio || 0, // VG比例
        };
      });

      // 📊 設置狀態
      setMaterials(materialsList);
      setFragrances(fragrancesList);
      setSuppliers(Array.from(suppliersMap.entries()).map(([id, name]) => ({ id, name })));

      console.log('✅ 按需載入完成:', {
        原料數量: materialsList.length,
        香精數量: fragrancesList.length,
        供應商數量: suppliersMap.size,
        產品關係數量: productsMap.size
      });

    } catch (error) {
      console.error("按需載入失敗:", error);
      toast.error("載入物料和香精資料失敗。");
    }
  }, [cartItems]); // 依賴購物車項目變化

  // 全域購物車已經自動同步，不需要本地存儲函數

  // 搜尋功能
  const handleSearch = useCallback((term: string) => {
    setItemSearchTerm(term);
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
      
      // 依照名稱排序並包含完整欄位
      const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
      setSearchResults(sorted.slice(0, 10).map(item => ({
        ...item,
        category: item.category || '',
        subCategory: item.subCategory || '',
        series: item.series || '',
        usedInProducts: item.usedInProducts || [],
      }))); // 限制搜尋結果數量並確保包含所有欄位
    }
  }, [materials, fragrances, suppliers, searchType]);

  // 添加項目到採購車 - 使用全域購物車
  const addToCart = useCallback(async (item: SearchResult) => {
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

    // 使用全域購物車的 addToCart 函數
    const cartItemData = {
      type: item.type as 'material' | 'fragrance',
      code: item.code,
      name: item.name,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      quantity: 1,
      unit: item.unit,
      currentStock: item.currentStock,
      price: item.costPerUnit,
      costPerUnit: item.costPerUnit,
      // 新增欄位
      category: item.category,
      subCategory: item.subCategory,
      series: item.series,
      usedInProducts: item.usedInProducts
    };
    
    await globalAddToCart(cartItemData);
  }, [globalAddToCart, materials, fragrances, setSearchResults, setSearchType]);

  // 從採購車移除項目 - 使用全域購物車
  const removeFromCart = useCallback(async (cartItemId: string) => {
    console.log(`🗑️ 嘗試刪除購物車項目:`, { cartItemId });

    // 🚀 極簡引用模式：直接使用購物車項目ID刪除
    const targetItem = cartItems.find(item => item.id === cartItemId);

    if (targetItem) {
      console.log(`✅ 找到要刪除的購物車項目:`, targetItem);
      await globalRemoveFromCart(cartItemId);
    } else {
      console.warn(`❌ 找不到要刪除的購物車項目:`, { cartItemId });
    }
  }, [cartItems, globalRemoveFromCart]);

  // 更新採購車項目數量 - 使用全域購物車
  const updateCartItemQuantity = useCallback(async (itemId: string, type: 'material' | 'fragrance', quantity: number) => {
    // 🚀 極簡引用模式：需要透過 code 來匹配購物車項目
    let targetItem = null;

    if (type === 'material') {
      const material = materials.find(m => m.id === itemId);
      if (material) {
        targetItem = cartItems.find(item => item.type === 'material' && item.code === material.code);
      }
    } else if (type === 'fragrance') {
      const fragrance = fragrances.find(f => f.id === itemId);
      if (fragrance) {
        targetItem = cartItems.find(item => item.type === 'fragrance' && item.code === fragrance.code);
      }
    }

    if (targetItem) {
      if (quantity <= 0) {
        await removeFromCart(targetItem.id);
        return;
      }
      await globalUpdateCartItem(targetItem.id, { quantity });
    }
  }, [cartItems, materials, fragrances, removeFromCart, globalUpdateCartItem]);

  // 開始編輯可做產品數量
  const startEditingProductCapacity = (itemId: string, currentCapacity: number) => {
    setEditingProductCapacity(prev => new Set([...prev, itemId]));
    setTempProductCapacity(prev => new Map([...prev, [itemId, currentCapacity]]));
  };

  // 取消編輯可做產品數量
  const cancelEditingProductCapacity = (itemId: string) => {
    setEditingProductCapacity(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
    setTempProductCapacity(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  // 保存可做產品數量並反向計算香精數量
  const saveProductCapacity = async (item: any) => {
    const newCapacity = tempProductCapacity.get(item.id);
    if (newCapacity === undefined || !item.percentage || item.percentage <= 0) return;

    // 反向計算所需香精數量：可做產品數量 × (香精比例 ÷ 100)
    const requiredFragranceQuantity = Math.round((newCapacity * (item.percentage / 100)) * 1000) / 1000;

    try {
      await updateCartItemQuantity(item.id, item.type, requiredFragranceQuantity);
      cancelEditingProductCapacity(item.id);
      toast.success(`已更新香精數量至 ${formatQuantity(requiredFragranceQuantity)} ${item.unit}`);
    } catch (error) {
      console.error('反向計算更新失敗:', error);
      toast.error('更新失敗');
    }
  };

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

  // 切換供應商全選狀態 - 動態計算供應商項目
  const toggleSupplierSelection = useCallback((supplierId: string) => {
    // 動態計算供應商的項目，不依賴 cartBySupplier
    const supplierItemKeys: string[] = [];

    // 遍歷所有購物車項目，找出屬於該供應商的項目
    cartItems.forEach(cartItem => {
      // 根據類型找到對應的完整資料
      if (cartItem.type === 'material') {
        const material = materials.find(m => m.code === cartItem.code);
        if (material && (material.supplierId === supplierId)) {
          supplierItemKeys.push(`${cartItem.id}-material`);
        }
      } else if (cartItem.type === 'fragrance') {
        const fragrance = fragrances.find(f => f.code === cartItem.code);
        if (fragrance && (fragrance.supplierId === supplierId)) {
          supplierItemKeys.push(`${cartItem.id}-fragrance`);
        }
      }
    });

    if (supplierItemKeys.length === 0) return;

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
  }, [cartItems, materials, fragrances]); // 依賴實際的資料來源

  // 顯示確認對話框
  const showConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  // 處理點擊項目詳情
  const handleItemDetailClick = useCallback((item: any) => {
    setItemDetailDialog({open: true, item});
  }, []);

  // 建立採購單 - 動態計算供應商分組
  const createPurchaseOrder = useCallback(async () => {
    console.log('🚀 開始建立採購單，當前選中項目:', Array.from(selectedCartItems));
    console.log('🛒 當前購物車項目數量:', cartItems.length);
    console.log('📦 當前原料數量:', materials.length);
    console.log('🌸 當前香精數量:', fragrances.length);
    console.log('🛒 購物車項目詳細:', cartItems.map(item => ({
      id: item.id,
      type: item.type,
      code: item.code
    })));

    setIsCreatingOrder(true);

    try {
      // 🚀 動態計算當前的 cartBySupplier 資料，避免依賴問題
      const currentCartBySupplier = (() => {
        const groups: Record<string, SupplierCartGroup> = {};

        cartItems.forEach(cartItem => {
          // 根據 cartItem.code 即時查詢完整資料
          let enrichedItem: any = null;
          let supplierId = 'unknown';
          let supplierName = '未指定供應商';

          if (cartItem.type === 'material') {
            console.log(`🔍 尋找原料 ${cartItem.code}，原料總數: ${materials.length}`);
            const material = materials.find(m => m.code === cartItem.code);
            if (material) {
              console.log(`✅ 找到原料:`, material);
              enrichedItem = {
                ...material,
                cartId: cartItem.id,
                quantity: cartItem.quantity,
                type: 'material' as const,
                addedBy: cartItem.addedBy,
                addedAt: cartItem.addedAt
              };
              // 🔍 使用已處理的供應商資料（與資料載入邏輯保持一致）
              supplierId = material.supplierId || 'unknown';
              supplierName = material.supplierName || '未指定供應商';
            } else {
              console.warn(`❌ 找不到原料 ${cartItem.code}`);
            }
          } else if (cartItem.type === 'fragrance') {
            console.log(`🔍 尋找香精 ${cartItem.code}，香精總數: ${fragrances.length}`);
            const fragrance = fragrances.find(f => f.code === cartItem.code);
            if (fragrance) {
              console.log(`✅ 找到香精:`, fragrance);
              enrichedItem = {
                ...fragrance,
                cartId: cartItem.id,
                quantity: cartItem.quantity,
                type: 'fragrance' as const,
                addedBy: cartItem.addedBy,
                addedAt: cartItem.addedAt
              };
              // 🔍 使用已處理的供應商資料（與資料載入邏輯保持一致）
              supplierId = fragrance.supplierId || 'unknown';
              supplierName = fragrance.supplierName || '未指定供應商';
            } else {
              console.warn(`❌ 找不到香精 ${cartItem.code}`);
            }
          }

          if (enrichedItem) {
            if (!groups[supplierId]) {
              groups[supplierId] = {
                supplierId,
                supplierName,
                items: []
              };
            }
            groups[supplierId].items.push(enrichedItem);
          }
        });

        return Object.values(groups);
      })();

      // 決定要處理的供應商項目
      let suppliersToProcess: SupplierCartGroup[] = [];

      if (selectedCartItems.size === 0) {
        // 沒有勾選任何項目，建立所有供應商的項目
        console.log('📋 沒有選中項目，建立所有採購單');
        suppliersToProcess = currentCartBySupplier;
      } else {
        // 只建立勾選的項目，需要按供應商重新分組
        console.log('📋 處理選中的項目...');
        console.log('📋 當前選中的項目keys:', Array.from(selectedCartItems));

        suppliersToProcess = currentCartBySupplier.map(supplierGroup => {
          console.log(`🔍 檢查供應商 ${supplierGroup.supplierName} 的項目:`, supplierGroup.items.map(item => ({
            id: item.id,
            cartId: item.cartId,
            type: item.type,
            key: `${item.cartId}-${item.type}`,
            selected: selectedCartItems.has(`${item.cartId}-${item.type}`)
          })));

          const selectedItems = supplierGroup.items.filter(item => {
            const key = `${item.cartId}-${item.type}`;
            const isSelected = selectedCartItems.has(key);
            console.log(`🔍 項目 ${item.name} (${key}) 是否選中: ${isSelected}`);
            return isSelected;
          });

          console.log(`✅ 供應商 ${supplierGroup.supplierName} 選中 ${selectedItems.length} 個項目`);

          return {
            ...supplierGroup,
            items: selectedItems
          };
        }).filter(group => group.items.length > 0); // 過濾掉沒有選中項目的供應商
      }

      if (suppliersToProcess.length === 0) {
        toast.error("沒有項目可以建立採購單");
        return;
      }

      // 轉換為 API 所需的格式
      const supplierGroups = suppliersToProcess.map(supplierGroup => ({
        supplierId: supplierGroup.supplierId,
        items: supplierGroup.items.map(item => {
          const baseItem = {
            id: item.id,
            name: item.name,
            code: item.code,
            quantity: item.quantity,
            unit: item.unit,
            price: item.costPerUnit || 0, // 使用即時查詢的最新價格
            itemRefPath: `${item.type === 'material' ? 'materials' : 'fragrances'}/${item.id}`
          };

          // 如果是香精，計算可做產品公斤數
          if (item.type === 'fragrance' && item.percentage && item.percentage > 0) {
            const productCapacityKg = (item.quantity / (item.percentage / 100));
            return {
              ...baseItem,
              productCapacityKg: Math.round(productCapacityKg * 100) / 100, // 四捨五入到小數點第二位
              fragrancePercentage: item.percentage
            };
          }

          return baseItem;
        })
      }));

      const payload = {
        suppliers: supplierGroups
      };

      console.log('🚀 建立採購單 payload:', payload);

      // 使用統一 API 客戶端
      const result = await apiClient.call('createPurchaseOrders', payload as any);

      if (result.success) {
        toast.success(`成功建立 ${supplierGroups.length} 張採購單`);

        // 🚀 從全域採購車中移除已使用的項目（使用原始 cartItems ID）
        const processedItemIds = new Set<string>();
        suppliersToProcess.forEach(supplierGroup => {
          supplierGroup.items.forEach(item => {
            // 找到對應的原始 CartItem ID
            const originalCartItem = cartItems.find(cartItem =>
              cartItem.type === item.type && cartItem.code === item.code
            );
            if (originalCartItem) {
              processedItemIds.add(originalCartItem.id);
            }
          });
        });

        for (const itemId of processedItemIds) {
          await globalRemoveFromCart(itemId);
        }

        setSelectedCartItems(new Set());
        setIsConfirmDialogOpen(false);

        // 重新載入採購單列表
        loadPurchaseOrders();
      }
    } catch (error) {
      console.error("建立採購單失敗:", error);
      toast.error("建立採購單失敗，請稍後重試");
    } finally {
      setIsCreatingOrder(false);
    }
  }, [selectedCartItems, cartItems, materials, fragrances, loadPurchaseOrders, globalRemoveFromCart, apiClient]);






  // 按供應商分組採購車 - 極簡引用模式，即時查詢資料
  const cartBySupplier = useMemo(() => {
    const groups: Record<string, SupplierCartGroup> = {};

    cartItems.forEach(cartItem => {
      // 🚀 極簡模式：根據 cartItem.code 即時查詢完整資料
      let enrichedItem: any = null;
      let supplierId = 'unknown';
      let supplierName = '未指定供應商';

      if (cartItem.type === 'material') {
        const material = materials.find(m => m.code === cartItem.code);
        if (material) {
          enrichedItem = {
            ...material,
            cartId: cartItem.id, // 購物車項目 ID
            quantity: cartItem.quantity, // 購物車數量
            type: 'material' as const,
            addedBy: cartItem.addedBy,
            addedAt: cartItem.addedAt
          };
          supplierId = material.supplierId || 'unknown';
          supplierName = material.supplierName || '未指定供應商';
        }
      } else if (cartItem.type === 'fragrance') {
        const fragrance = fragrances.find(f => f.code === cartItem.code);
        if (fragrance) {
          enrichedItem = {
            ...fragrance,
            cartId: cartItem.id, // 購物車項目 ID
            quantity: cartItem.quantity, // 購物車數量
            type: 'fragrance' as const,
            addedBy: cartItem.addedBy,
            addedAt: cartItem.addedAt
          };
          supplierId = fragrance.supplierId || 'unknown';
          supplierName = fragrance.supplierName || '未指定供應商';
        }
      }

      // 如果找不到對應的原料或香精，建立錯誤項目
      if (!enrichedItem) {
        enrichedItem = {
          id: cartItem.id,
          cartId: cartItem.id,
          code: cartItem.code,
          name: `⚠️ 找不到項目 (${cartItem.code})`,
          type: cartItem.type,
          quantity: cartItem.quantity,
          currentStock: 0,
          unit: '未知',
          costPerUnit: 0,
          category: '⚠️ 需要更新',
          addedBy: cartItem.addedBy,
          addedAt: cartItem.addedAt
        };
        supplierId = 'error';
        supplierName = '⚠️ 資料錯誤';
      }

      // 建立或更新供應商分組
      if (!groups[supplierId]) {
        groups[supplierId] = {
          supplierId,
          supplierName,
          items: []
        };
      }

      groups[supplierId].items.push(enrichedItem);
    });

    return Object.values(groups);
  }, [cartItems, materials, fragrances]);

  // 計算總金額 - 極簡引用模式，即時查詢價格
  const totalAmount = useMemo(() => {
    return cartItems.reduce((total, cartItem) => {
      let price = 0;

      // 🚀 極簡模式：根據 code 即時查詢最新價格
      if (cartItem.type === 'material') {
        const material = materials.find(m => m.code === cartItem.code);
        price = material?.costPerUnit || 0;
      } else if (cartItem.type === 'fragrance') {
        const fragrance = fragrances.find(f => f.code === cartItem.code);
        price = fragrance?.costPerUnit || 0;
      }

      return total + (price * cartItem.quantity);
    }, 0);
  }, [cartItems, materials, fragrances]);

  useEffect(() => {
    loadPurchaseOrders();
    loadItems();
  }, [loadPurchaseOrders, loadItems]);

  // 🔄 每次採購車內容變化時，重新載入最新的物料和香精數據
  useEffect(() => {
    if (cartItems.length > 0) {
      console.log('🔄 採購車內容變化，重新載入最新數據...');
      loadItems(); // 重新載入最新的物料和香精數據
    }
  }, [cartItems.length, loadItems]); // 當採購車項目數量變化時觸發

  // 🔄 頁面獲得焦點時重新載入最新數據（確保跨頁面操作後數據同步）
  useEffect(() => {
    const handleFocus = () => {
      if (cartItems.length > 0) {
        console.log('🔄 頁面獲得焦點，重新載入最新數據...');
        loadItems();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && cartItems.length > 0) {
        console.log('🔄 頁面可見性變化，重新載入最新數據...');
        loadItems();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cartItems.length, loadItems]);


  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewPurchase && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看採購訂單頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 purchase-orders-page">
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          採購管理
        </h1>
        <p className="text-gray-600 mt-2">管理採購訂單與供應商交易</p>
      </div>

      {/* 1. 採購清單區域 - 使用 StandardDataListPage */}
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
          <StandardDataListPage
            data={filteredPurchaseOrders}
            loading={isLoading}
            columns={columns}
            actions={actions}
            onRowClick={(record) => router.push(`/dashboard/purchase-orders/${record.id}`)}
            
            // 搜尋與過濾
            searchable={true}
            searchPlaceholder="搜尋採購單編號、供應商、建立人員..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            quickFilters={quickFilters}
            activeFilters={activeFilters}
            onFilterChange={(key, value) => {
              if (value === null) {
                clearFilter(key);
              } else {
                setFilter(key, value);
              }
            }}
            onClearFilters={() => {
              Object.keys(activeFilters).forEach(key => clearFilter(key));
            }}
            
            // 統計資訊
            stats={stats}
            showStats={true}
            
            // 工具列功能
            showToolbar={true}
          />
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
                  setItemSearchTerm('');
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
                  setItemSearchTerm('');
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
              value={itemSearchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-3 border-amber-200 focus:border-amber-500 focus:ring-amber-500"
            />
            {searchResults.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchResults([]);
                  setItemSearchTerm('');
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🔄 手動刷新採購車數據...');
                  loadItems();
                  toast.success('已刷新採購車數據');
                }}
                className="ml-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <span className="text-sm text-gray-500">
                ({cartItems.length} 個項目，總計 NT$ {Math.round(totalAmount).toLocaleString()})
              </span>
            </div>
            {cartItems.length > 0 && canManagePurchase && (
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
          {/* 購物車說明提示 */}
          <Alert className="mb-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              <div className="font-semibold mb-1">🛒 全域購物車說明</div>
              <div className="space-y-1 text-xs">
                <div>• 購物車會在所有裝置間即時同步，支援多人協作採購</div>
                <div>• 在原料庫或配方庫添加的項目都會自動出現在這裡</div>
                <div>• 側邊欄的紅色氣泡會顯示目前購物車項目數量</div>
                <div>• 建立採購單後，相關項目會自動從購物車中移除</div>
                <div>• 可以選擇部分項目建立採購單，其餘項目保留在購物車中</div>
              </div>
            </AlertDescription>
          </Alert>

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
                          selectedCartItems.has(`${item.cartId}-${item.type}`)
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
                  
                  {/* 桌面版表格顯示 */}
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>項目資訊</TableHead>
                          <TableHead>用途/使用產品</TableHead>
                          <TableHead>現有庫存</TableHead>
                          <TableHead>單價</TableHead>
                          <TableHead>數量</TableHead>
                          <TableHead>可做產品</TableHead>
                          <TableHead className="w-12">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierGroup.items.map((item) => (
                          <TableRow key={`${item.cartId}-${item.type}`} className="hover:bg-amber-50/50">
                            <TableCell>
                              <Checkbox
                                checked={selectedCartItems.has(`${item.cartId}-${item.type}`)}
                                onCheckedChange={() => toggleCartItemSelection(item.cartId, item.type)}
                                className="border-amber-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  item.type === 'material'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-pink-100 text-pink-600'
                                }`}>
                                  {item.type === 'material' ? <Package className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                                </div>
                                <div>
                                  <div
                                    className="font-medium text-gray-900 cursor-pointer hover:text-amber-600 transition-colors"
                                    onClick={() => handleItemDetailClick(item)}
                                  >
                                    {item.name}
                                  </div>
                                  <div className="text-sm text-gray-500">{item.code}</div>
                                  {/* 香精可做產品公斤數 */}
                                  {item.type === 'fragrance' && item.percentage && item.percentage > 0 && (
                                    <div className="text-xs text-purple-600 mt-1">
                                      可做產品: {(item.quantity / (item.percentage / 100)).toFixed(2)} KG
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.type === 'material' ? (
                                <div className="text-sm">
                                  {item.category && item.subCategory ? (
                                    <div className="text-blue-600">
                                      <div className="font-semibold">{item.category}</div>
                                      <div className="text-xs">→ {item.subCategory}</div>
                                    </div>
                                  ) : item.category ? (
                                    <span className="text-blue-600 font-semibold">{item.category}</span>
                                  ) : (
                                    <span className="text-gray-400">未分類</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm">
                                  {item.usedInProducts && item.usedInProducts.length > 0 ? (
                                    <div className="text-pink-600">
                                      <div className="text-xs mb-1">用於 {item.usedInProducts.length} 項產品</div>
                                      <div className="space-y-1">
                                        {item.usedInProducts.slice(0, 2).map((product: string, index: number) => (
                                          <div key={index} className="text-xs bg-pink-50 px-2 py-1 rounded inline-block mr-1">
                                            {product}
                                          </div>
                                        ))}
                                        {item.usedInProducts.length > 2 && (
                                          <div className="text-xs text-pink-500">等{item.usedInProducts.length}項</div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">未使用</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-semibold text-green-700">
                                  {(item.currentStock || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-green-600">{item.unit}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium text-amber-600">
                                NT$ {Math.round(item.price || item.costPerUnit || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">/ {item.unit}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newQuantity = Math.round(parseFloat(e.target.value) * 1000) / 1000 || 0;
                                    updateCartItemQuantity(item.id, item.type, newQuantity);
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="w-20 h-8 text-center text-sm border-amber-200 focus:border-amber-500 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-xs text-gray-500 min-w-0 truncate">{item.unit}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.type === 'fragrance' && item.percentage && item.percentage > 0 ? (
                                <div className="text-sm">
                                  {editingProductCapacity.has(item.id) ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={tempProductCapacity.get(item.id) || 0}
                                        onChange={(e) => {
                                          const value = Math.round(parseFloat(e.target.value) * 1000) / 1000 || 0;
                                          setTempProductCapacity(prev => new Map([...prev, [item.id, value]]));
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="w-16 h-6 text-xs text-center"
                                      />
                                      <span className="text-xs text-gray-500">KG</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => saveProductCapacity(item)}
                                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => cancelEditingProductCapacity(item.id)}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      >
                                        <Ban className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <div className="font-semibold text-purple-600">
                                        {formatQuantity(Math.round((item.quantity / (item.percentage / 100)) * 1000) / 1000)} KG
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditingProductCapacity(item.id, Math.round((item.quantity / (item.percentage / 100)) * 1000) / 1000)}
                                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    (香精 {item.percentage}%)
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.cartId)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 平板和手機版卡片顯示 */}
                  <div className="lg:hidden divide-y divide-amber-100">
                    {supplierGroup.items.map((item) => (
                      <div key={`${item.cartId}-${item.type}`} className="p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedCartItems.has(`${item.cartId}-${item.type}`)}
                            onCheckedChange={() => toggleCartItemSelection(item.cartId, item.type)}
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
                            <div 
                              className="font-medium text-gray-900 cursor-pointer hover:text-amber-600 transition-colors"
                              onClick={() => handleItemDetailClick(item)}
                            >
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500 space-y-1">
                              <div>
                                {item.code} • NT$ {Math.round(item.price || item.costPerUnit || 0).toLocaleString()}/{item.unit}
                              </div>
                              {/* 香精可做產品公斤數 */}
                              {item.type === 'fragrance' && item.percentage && item.percentage > 0 && (
                                <div className="text-xs text-purple-600">
                                  🏆 可做產品: {formatQuantity(Math.round((item.quantity / (item.percentage / 100)) * 1000) / 1000)} KG (香精 {item.percentage}%)
                                </div>
                              )}
                              {/* 原料用途或香精使用產品 */}
                              {item.type === 'material' ? (
                                <div className="text-xs text-blue-600">
                                  {item.category && item.subCategory ? (
                                    <span>📦 {item.category} → {item.subCategory}</span>
                                  ) : item.category ? (
                                    <span>📦 {item.category}</span>
                                  ) : (
                                    <span className="text-gray-400">📦 未分類</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-pink-600">
                                  {item.usedInProducts && item.usedInProducts.length > 0 ? (
                                    <span>🏷️ 用於: {item.usedInProducts.slice(0, 2).join(', ')}{item.usedInProducts.length > 2 ? ` 等${item.usedInProducts.length}項產品` : ''}</span>
                                  ) : (
                                    <span className="text-gray-400">🏷️ 未使用於任何產品</span>
                                  )}
                                </div>
                              )}
                              {/* 現有庫存 */}
                              <div className="text-xs text-green-600">
                                📊 庫存: <span className="font-semibold">{(item.currentStock || 0).toLocaleString()}</span> {item.unit}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = Math.round(parseFloat(e.target.value) * 1000) / 1000 || 0;
                                  updateCartItemQuantity(item.id, item.type, newQuantity);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-20 h-8 text-center text-sm border-amber-200 focus:border-amber-500 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-sm text-gray-500">{item.unit}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.cartId)}
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
                : cartItems.filter(cartItem => {
                    // 直接使用 cartItem 的 id 來構建 key
                    const key = `${cartItem.id}-${cartItem.type}`;
                    const isSelected = selectedCartItems.has(key);
                    console.log(`🔍 確認對話框 - ${cartItem.type === 'material' ? '原料' : '香精'} ${cartItem.code} (${key}) 是否選中: ${isSelected}`);
                    return isSelected;
                  });
              
              // 🚀 按供應商分組 - 需要即時查詢供應商資訊
              const supplierGroups = itemsToShow.reduce((groups, cartItem) => {
                // 根據 cartItem.code 查詢完整資料以獲取供應商資訊
                let supplierId = 'unknown';
                let supplierName = '未指定供應商';
                let enrichedItem: any = null;

                if (cartItem.type === 'material') {
                  const material = materials.find(m => m.code === cartItem.code);
                  if (material) {
                    supplierId = material.supplierId || 'unknown';
                    supplierName = material.supplierName || '未指定供應商';
                    enrichedItem = {
                      ...material,
                      quantity: cartItem.quantity,
                      type: cartItem.type,
                      code: cartItem.code,
                      id: cartItem.id
                    };
                  }
                } else if (cartItem.type === 'fragrance') {
                  const fragrance = fragrances.find(f => f.code === cartItem.code);
                  if (fragrance) {
                    supplierId = fragrance.supplierId || 'unknown';
                    supplierName = fragrance.supplierName || '未指定供應商';
                    enrichedItem = {
                      ...fragrance,
                      quantity: cartItem.quantity,
                      type: cartItem.type,
                      code: cartItem.code,
                      id: cartItem.id
                    };
                  }
                }

                if (enrichedItem) {
                  if (!groups[supplierId]) {
                    groups[supplierId] = {
                      supplierName,
                      items: []
                    };
                  }
                  groups[supplierId].items.push(enrichedItem);
                }

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
                                    {item.code} • NT$ {Math.round(item.price || item.costPerUnit || 0).toLocaleString()}/{item.unit}
                                  </div>
                                  {/* 香精可做產品公斤數 */}
                                  {item.type === 'fragrance' && item.percentage && item.percentage > 0 && (
                                    <div className="text-xs text-purple-600 mt-1">
                                      可做產品: {formatQuantity(Math.round((item.quantity / (item.percentage / 100)) * 1000) / 1000)} KG (香精 {item.percentage}%)
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">
                                  {item.quantity} {item.unit}
                                </div>
                                <div className="text-sm text-gray-500">
                                  NT$ {Math.round((item.price || item.costPerUnit || 0) * item.quantity).toLocaleString()}
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

      {/* 項目詳情對話框 */}
      <Dialog open={itemDetailDialog.open} onOpenChange={(open) => setItemDetailDialog({open, item: null})}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                itemDetailDialog.item?.type === 'material' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-pink-100 text-pink-600'
              }`}>
                {itemDetailDialog.item?.type === 'material' ? <Package className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
              </div>
              {itemDetailDialog.item?.name}
            </DialogTitle>
            <DialogDescription>
              {itemDetailDialog.item?.type === 'material' ? '原料' : '香精'}詳細資訊
            </DialogDescription>
          </DialogHeader>
          
          {itemDetailDialog.item && (
            <div className="space-y-6">
              {/* 基本資訊 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">項目代號</Label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-md">
                    {itemDetailDialog.item.code}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">項目名稱</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {itemDetailDialog.item.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">單位</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {itemDetailDialog.item.unit}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">單位成本</Label>
                  <div className="text-sm text-amber-600 font-semibold bg-amber-50 px-3 py-2 rounded-md">
                    NT$ {Math.round(itemDetailDialog.item.price || itemDetailDialog.item.costPerUnit || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 庫存資訊 */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">庫存資訊</span>
                </div>
                <div className="text-lg font-bold text-green-700">
                  {(itemDetailDialog.item.currentStock || 0).toLocaleString()} {itemDetailDialog.item.unit}
                </div>
                <div className="text-xs text-green-600 mt-1">現有庫存</div>
              </div>

              {/* 用途或使用產品 */}
              {itemDetailDialog.item.type === 'material' ? (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">原料分類</span>
                  </div>
                  {itemDetailDialog.item.category && itemDetailDialog.item.subCategory ? (
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-blue-700">{itemDetailDialog.item.category}</div>
                      <div className="text-sm text-blue-600">→ {itemDetailDialog.item.subCategory}</div>
                    </div>
                  ) : itemDetailDialog.item.category ? (
                    <div className="text-sm font-semibold text-blue-700">{itemDetailDialog.item.category}</div>
                  ) : (
                    <div className="text-sm text-gray-500">未分類</div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-pink-600" />
                    <span className="text-sm font-medium text-pink-800">使用產品</span>
                  </div>
                  {itemDetailDialog.item.usedInProducts && itemDetailDialog.item.usedInProducts.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm text-pink-600 mb-2">
                        此香精用於 {itemDetailDialog.item.usedInProducts.length} 項產品：
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {itemDetailDialog.item.usedInProducts.map((product: string, index: number) => (
                          <span key={index} className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">未使用於任何產品</div>
                  )}
                  {itemDetailDialog.item.series && (
                    <div className="mt-2 pt-2 border-t border-pink-200">
                      <div className="text-xs text-pink-600 mb-1">香精系列</div>
                      <div className="text-sm font-semibold text-pink-700">{itemDetailDialog.item.series}</div>
                    </div>
                  )}
                </div>
              )}

              {/* 供應商資訊 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">供應商資訊</span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {itemDetailDialog.item.supplierName || '未指定供應商'}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemDetailDialog({open: false, item: null})}
            >
              關閉
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
