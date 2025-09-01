// src/app/dashboard/fragrances/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { FragranceDialog, FragranceData } from './FragranceDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, ShoppingCart, Search, Package, Calculator, FileSpreadsheet, Warehouse, Plus, Eye, Edit, Droplets, Building, Calendar, AlertTriangle, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { useGlobalCart } from '@/hooks/useGlobalCart';

interface FragranceWithSupplier extends FragranceData {
  supplierName: string;
  fragranceStatus?: string;
}

function FragrancesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fragrances, setFragrances] = useState<FragranceWithSupplier[]>([]);
  const [filteredFragrances, setFilteredFragrances] = useState<FragranceWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedFragrance, setSelectedFragrance] = useState<FragranceData | null>(null);
  const [purchaseCart, setPurchaseCart] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isStocktakeMode, setIsStocktakeMode] = useState(false);
  const [updatedStocks, setUpdatedStocks] = useState<Record<string, number>>({});
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailFragrance, setSelectedDetailFragrance] = useState<FragranceWithSupplier | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [selectedFragranceTypes, setSelectedFragranceTypes] = useState<Set<string>>(new Set());
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewFragrances = hasPermission('fragrances.view') || hasPermission('fragrances.manage');
  const canManageFragrances = hasPermission('fragrances.manage');
  
  // 全域購物車
  const { addToCart, isLoading: cartLoading } = useGlobalCart();
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化");
      }
      
      // 載入供應商資料
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersMap = new Map();
      suppliersSnapshot.docs.forEach(doc => {
        suppliersMap.set(doc.id, doc.data().name);
      });

      // 載入香精資料
      const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'));
      const fragrancesList = fragrancesSnapshot.docs.map(doc => {
        const data = doc.data();
        const supplierRef = data.supplierRef as DocumentReference | undefined;
        const supplierName = supplierRef ? suppliersMap.get(supplierRef.id) || 'N/A' : '未指定';
        
        // 詳細調試：檢查資料庫中的原始值
        console.log(`=== 香精 ${data.name} (${data.code}) 的詳細資料 ===`);
        console.log('原始資料庫資料:', data);
        console.log('fragranceType 原始值:', data.fragranceType, '類型:', typeof data.fragranceType);
        console.log('fragranceStatus 原始值:', data.fragranceStatus, '類型:', typeof data.fragranceStatus);
        console.log('status 原始值:', data.status, '類型:', typeof data.status);
        console.log('所有欄位名稱:', Object.keys(data));
        
        // 確保正確讀取 fragranceType 和 fragranceStatus
        const fragranceType = data.fragranceType || '未指定';
        const fragranceStatus = data.fragranceStatus || '未指定';
        
        console.log('處理後的 fragranceType:', fragranceType);
        console.log('處理後的 fragranceStatus:', fragranceStatus);
        console.log('=====================================');
        
        return {
          id: doc.id,
          code: data.code,
          name: data.name,
          status: data.status,
          fragranceType: fragranceType,
          fragranceStatus: fragranceStatus,
          supplierRef: data.supplierRef,
          safetyStockLevel: data.safetyStockLevel,
          costPerUnit: data.costPerUnit,
          percentage: data.percentage,
          pgRatio: data.pgRatio,
          vgRatio: data.vgRatio,
          currentStock: data.currentStock,
          supplierName,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as FragranceWithSupplier;
      });
      setFragrances(fragrancesList);
      setFilteredFragrances(fragrancesList);
    } catch (error) {
      console.error("讀取香精資料失敗:", error);
      toast.error("讀取香精資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && fragrances.length > 0) {
      const fragranceToEdit = fragrances.find(f => f.id === editId);
      if (fragranceToEdit) {
        setSelectedFragrance(fragranceToEdit);
        setIsDialogOpen(true);
        // 清除 URL 中的 edit 參數
        router.replace('/dashboard/fragrances');
      }
    }
  }, [searchParams, fragrances, router]);

  // 搜尋過濾功能
  useEffect(() => {
    if (!searchTerm.trim() && selectedSuppliers.size === 0 && selectedFragranceTypes.size === 0 && !showLowStockOnly) {
      setFilteredFragrances(fragrances);
      return;
    }

    const filtered = fragrances.filter(fragrance => {
      // 搜尋詞過濾
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          fragrance.code?.toLowerCase().includes(searchLower) ||
          fragrance.name?.toLowerCase().includes(searchLower) ||
          fragrance.supplierName?.toLowerCase().includes(searchLower) ||
          fragrance.fragranceType?.toLowerCase().includes(searchLower) ||
          fragrance.currentStock?.toString().includes(searchLower) ||
          fragrance.costPerUnit?.toString().includes(searchLower) ||
          fragrance.percentage?.toString().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // 供應商過濾
      if (selectedSuppliers.size > 0 && !selectedSuppliers.has(fragrance.supplierName)) {
        return false;
      }

      // 香精種類過濾
      if (selectedFragranceTypes.size > 0 && !selectedFragranceTypes.has(fragrance.fragranceType || '')) {
        return false;
      }

      // 低庫存過濾
      if (showLowStockOnly) {
        const isLowStock = typeof fragrance.safetyStockLevel === 'number' && fragrance.currentStock < fragrance.safetyStockLevel;
        if (!isLowStock) return false;
      }

      return true;
    });

    // 排序：啟用狀態 -> 香精種類 -> 香精名稱
    const sortedFragrances = filtered.sort((a, b) => {
      // 1. 按啟用狀態排序：啟用 -> 備用 -> 棄用
      const statusOrder = { '啟用': 1, '備用': 2, '棄用': 3 };
      const aStatus = statusOrder[a.fragranceStatus as keyof typeof statusOrder] || 4;
      const bStatus = statusOrder[b.fragranceStatus as keyof typeof statusOrder] || 4;
      
      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }

      // 2. 按香精種類排序
      const typeOrder = { '棉芯': 1, '陶瓷芯': 2, '棉陶芯通用': 3 };
      const aType = typeOrder[a.fragranceType as keyof typeof typeOrder] || 4;
      const bType = typeOrder[b.fragranceType as keyof typeof typeOrder] || 4;
      
      if (aType !== bType) {
        return aType - bType;
      }

      // 3. 按香精名稱排序
      return (a.name || '').localeCompare(b.name || '', 'zh-TW');
    });

    setFilteredFragrances(sortedFragrances);
  }, [fragrances, searchTerm, selectedSuppliers, selectedFragranceTypes, showLowStockOnly]);

  // 智能篩選標籤邏輯
  const { availableSuppliers, availableFragranceTypes } = useMemo(() => {
    // 先根據搜尋詞過濾
    let searchFilteredFragrances = fragrances;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      searchFilteredFragrances = fragrances.filter(fragrance => {
        return (
          fragrance.code?.toLowerCase().includes(searchLower) ||
          fragrance.name?.toLowerCase().includes(searchLower) ||
          fragrance.supplierName?.toLowerCase().includes(searchLower) ||
          fragrance.fragranceType?.toLowerCase().includes(searchLower) ||
          fragrance.currentStock?.toString().includes(searchLower) ||
          fragrance.costPerUnit?.toString().includes(searchLower) ||
          fragrance.percentage?.toString().includes(searchLower)
        );
      });
    }

    // 從搜尋結果中提取可用的供應商和香精種類
    const availableSuppliers = new Set<string>();
    const availableFragranceTypes = new Set<string>();
    
    searchFilteredFragrances.forEach(fragrance => {
      if (fragrance.supplierName) availableSuppliers.add(fragrance.supplierName);
      if (fragrance.fragranceType) availableFragranceTypes.add(fragrance.fragranceType);
    });

    // 根據當前選擇進行智能篩選
    let finalSuppliers = new Set<string>();
    let finalFragranceTypes = new Set<string>();

    if (selectedSuppliers.size > 0 && selectedFragranceTypes.size > 0) {
      // 兩個都選了：只顯示選中的標籤
      finalSuppliers = new Set(selectedSuppliers);
      finalFragranceTypes = new Set(selectedFragranceTypes);
    } else if (selectedSuppliers.size > 0) {
      // 只選了供應商：顯示選中的供應商和相關的香精種類
      finalSuppliers = new Set(selectedSuppliers);
      searchFilteredFragrances.forEach(fragrance => {
        if (selectedSuppliers.has(fragrance.supplierName || '')) {
          if (fragrance.fragranceType) {
            finalFragranceTypes.add(fragrance.fragranceType);
          }
        }
      });
    } else if (selectedFragranceTypes.size > 0) {
      // 只選了香精種類：顯示選中的香精種類和相關的供應商
      finalFragranceTypes = new Set(selectedFragranceTypes);
      searchFilteredFragrances.forEach(fragrance => {
        if (selectedFragranceTypes.has(fragrance.fragranceType || '')) {
          if (fragrance.supplierName) {
            finalSuppliers.add(fragrance.supplierName);
          }
        }
      });
    } else {
      // 都沒選：顯示所有可用的標籤
      finalSuppliers = availableSuppliers;
      finalFragranceTypes = availableFragranceTypes;
    }

    return {
      availableSuppliers: Array.from(finalSuppliers).sort(),
      availableFragranceTypes: Array.from(finalFragranceTypes).sort()
    };
  }, [fragrances, searchTerm, selectedSuppliers, selectedFragranceTypes]);

  // 移除舊的邏輯，使用新的智能篩選邏輯

  const handleCartToggle = (fragranceId: string) => {
    setPurchaseCart(prevCart => {
      const newCart = new Set(prevCart);
      if (newCart.has(fragranceId)) {
        newCart.delete(fragranceId);
      } else {
        newCart.add(fragranceId);
      }
      return newCart;
    });
  };
  
  // 添加到採購車 - 使用全域購物車
  const addToPurchaseCart = async (fragrance: FragranceWithSupplier) => {
    try {
      const cartItem = {
        id: fragrance.id,
        type: 'fragrance' as const,
        code: fragrance.code,
        name: fragrance.name,
        supplierId: fragrance.supplierRef?.id || '',
        supplierName: fragrance.supplierName || '未指定',
        quantity: 1,
        unit: fragrance.unit || 'KG',
        currentStock: fragrance.currentStock || 0,
        costPerUnit: fragrance.costPerUnit || 0,
        price: fragrance.costPerUnit || 0
      };

      await addToCart(cartItem);
      toast.success(`已將 ${fragrance.name} 加入採購車`);
    } catch (error) {
      console.error("添加到採購車失敗:", error);
      toast.error("添加到採購車失敗");
    }
  };
  
  const handleAddToPurchaseCart = async () => {
    if (purchaseCart.size === 0) {
      toast.info("請至少選擇一個香精加入採購車。");
      return;
    }
    
    try {
      // 獲取選中的香精資料
      const selectedFragrances = fragrances.filter(f => purchaseCart.has(f.id));
      let successCount = 0;
      
      // 逐一添加到全域購物車
      for (const fragrance of selectedFragrances) {
        const cartItem = {
          id: fragrance.id,
          type: 'fragrance' as const,
          code: fragrance.code,
          name: fragrance.name,
          supplierId: fragrance.supplierRef?.id || '',
          supplierName: fragrance.supplierName,
          quantity: 1,
          unit: fragrance.unit || 'KG',
          currentStock: fragrance.currentStock || 0,
          costPerUnit: fragrance.costPerUnit || 0,
          price: fragrance.costPerUnit || 0
        };
        
        await addToCart(cartItem);
        successCount++;
      }
      
      if (successCount > 0) {
        toast.success(`已將 ${successCount} 個香精加入採購車`);
        setPurchaseCart(new Set()); // 清空選中的項目
      } else {
        toast.error("加入採購車失敗");
      }
    } catch (error) {
      console.error("加入採購車失敗:", error);
      toast.error("加入採購車失敗");
    }
  };

  const handleBatchDelete = () => {
    if (purchaseCart.size === 0) {
      toast.info("請至少選擇一個香精進行刪除。");
      return;
    }
    setIsBatchDeleteOpen(true);
  };

  const handleConfirmBatchDelete = async () => {
    const selectedFragranceIds = Array.from(purchaseCart);
    if (selectedFragranceIds.length === 0) return;

    const toastId = toast.loading(`正在刪除 ${selectedFragranceIds.length} 個香精...`);
    try {
      const functions = getFunctions();
      const deleteFragrance = httpsCallable(functions, 'deleteFragrance');
      
      // 批量刪除選中的香精
      for (const fragranceId of selectedFragranceIds) {
        await deleteFragrance({ fragranceId });
      }

      toast.success(`成功刪除 ${selectedFragranceIds.length} 個香精。`, { id: toastId });
      setPurchaseCart(new Set()); // 清空選中的項目
      loadData();
    } catch (error) {
      console.error("批量刪除香精失敗:", error);
      let errorMessage = "批量刪除香精時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsBatchDeleteOpen(false);
    }
  };

  const getLowStockCount = () => {
    return fragrances.filter(f => typeof f.safetyStockLevel === 'number' && f.currentStock < f.safetyStockLevel).length;
  };

  const handleAdd = () => {
    setSelectedFragrance(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (fragrance: FragranceData) => {
    setSelectedFragrance(fragrance);
    setIsDialogOpen(true);
  };

  const handleDelete = (fragrance: FragranceData) => {
    setSelectedFragrance(fragrance);
    setIsConfirmOpen(true);
  };

  const handleViewDetail = (fragrance: FragranceWithSupplier) => {
    setSelectedDetailFragrance(fragrance);
    setIsDetailViewOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedFragrance) return;

    const toastId = toast.loading("正在刪除香精...");
    try {
      const functions = getFunctions();
      const deleteFragrance = httpsCallable(functions, 'deleteFragrance');
      await deleteFragrance({ fragranceId: selectedFragrance.id });

      toast.success(`香精 ${selectedFragrance.name} 已成功刪除。`, { id: toastId });
      loadData();
    } catch (error) {
      console.error("刪除香精失敗:", error);
      let errorMessage = "刪除香精時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedFragrance(null);
    }
  };

  // 盤點功能相關函式
  const handleStockChange = (id: string, value: number) => {
    setUpdatedStocks(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveStocktake = async () => {
    const changedItems = fragrances
      .filter(f => updatedStocks[f.id] !== undefined && updatedStocks[f.id] !== f.currentStock)
      .map(f => ({
        itemRefPath: `fragrances/${f.id}`,
        currentStock: f.currentStock,
        newStock: updatedStocks[f.id],
      }));

    if (changedItems.length === 0) {
      toast.info("庫存數量沒有變更，無需儲存。");
      setIsStocktakeMode(false);
      setUpdatedStocks({});
      return;
    }

    const toastId = toast.loading("正在儲存盤點結果...");
    try {
      const functions = getFunctions();
      const performStocktake = httpsCallable(functions, 'performStocktake');
      await performStocktake({ items: changedItems });
      
      toast.success("盤點結果儲存成功，庫存已更新。", { id: toastId });
      setUpdatedStocks({});
      setIsStocktakeMode(false);
      loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "儲存盤點失敗";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleCancelStocktake = () => {
    setUpdatedStocks({});
    setIsStocktakeMode(false);
  };

  // 四捨五入到小數點第二位的函數
  const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // 計算 PG 和 VG 比例的函數
  const calculatePGRatios = (fragrancePercentage: number): { pgRatio: number; vgRatio: number } => {
    const remainingPercentage = 100 - fragrancePercentage;
    
    // 根據香精種類決定 PG/VG 比例
    // 這裡使用標準的 PG/VG 比例：PG 70%, VG 30%
    const pgRatio = roundToTwoDecimals(remainingPercentage * 0.7); // 四捨五入到小數點後2位
    const vgRatio = roundToTwoDecimals(remainingPercentage * 0.3); // 四捨五入到小數點後2位
    
    return { pgRatio, vgRatio };
  };

  // 匯入/匯出處理函式
  const handleImport = async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
    const functions = getFunctions();
    
    try {
      // 調試日誌：檢查匯入資料
      console.log('開始匯入香精資料:', {
        totalRecords: data.length,
        sampleData: data.slice(0, 3).map(item => ({
          name: item.name,
          code: item.code,
          supplierName: item.supplierName,
          fragranceType: item.fragranceType,
          fragranceStatus: item.fragranceStatus,
          currentStock: item.currentStock,
          safetyStockLevel: item.safetyStockLevel,
          costPerUnit: item.costPerUnit,
          percentage: item.percentage,
          hasSupplierName: !!item.supplierName
        }))
      });
      
      // 獲取供應商映射表
      const suppliersMap = new Map<string, string>();
      if (!db) {
        throw new Error("Firebase 未初始化");
      }
      const supplierSnapshot = await getDocs(collection(db, "suppliers"));
      supplierSnapshot.forEach(doc => {
        const supplierData = doc.data();
        suppliersMap.set(supplierData.name, doc.id);
        console.log(`供應商映射: ${supplierData.name} -> ${doc.id}`);
      });
      
      console.log('供應商映射表:', Array.from(suppliersMap.entries()));
      
      // 獲取現有香精代號映射表
      const existingFragrancesMap = new Map<string, string>();
      const fragranceSnapshot = await getDocs(collection(db, "fragrances"));
      fragranceSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.code) {
          existingFragrancesMap.set(data.code, doc.id);
        }
      });
      
      // 分批處理資料
      const batchSize = 20; // 每批處理20筆
      const totalBatches = Math.ceil(data.length / batchSize);
      let processedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;
      
      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize;
        const endIndex = Math.min(startIndex + batchSize, data.length);
        const batch = data.slice(startIndex, endIndex);
        
        // 處理每一批資料
        for (const item of batch) {
          try {
            // 處理供應商ID
            let supplierId = undefined;
            if (item.supplierName && item.supplierName.trim() !== '') {
              const trimmedSupplierName = item.supplierName.trim();
              supplierId = suppliersMap.get(trimmedSupplierName);
              console.log(`尋找供應商: "${trimmedSupplierName}" -> ${supplierId || '未找到'}`);
              if (!supplierId) {
                console.warn(`找不到供應商: "${trimmedSupplierName}"`);
              }
            }
            
            // 處理香精種類（保持中文，不轉換為英文）
            let fragranceType = item.fragranceType;
            if (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') {
              // 如果輸入的是英文，轉換為中文
              switch (fragranceType) {
                case 'cotton':
                  fragranceType = '棉芯';
                  break;
                case 'ceramic':
                  fragranceType = '陶瓷芯';
                  break;
                case 'universal':
                  fragranceType = '棉陶芯通用';
                  break;
                default:
                  // 如果已經是中文，保持不變
                  break;
              }
            } else {
              // 如果為空，設置為空字串
              fragranceType = '';
            }

            // 處理啟用狀態（保持中文，不轉換為英文）
            let fragranceStatus = item.fragranceStatus;
            if (fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '') {
              // 如果輸入的是英文，轉換為中文
              switch (fragranceStatus) {
                case 'active':
                  fragranceStatus = '啟用';
                  break;
                case 'standby':
                  fragranceStatus = '備用';
                  break;
                case 'discontinued':
                  fragranceStatus = '棄用';
                  break;
                default:
                  // 如果已經是中文，保持不變
                  break;
              }
            } else {
              // 如果為空，設置為空字串
              fragranceStatus = '';
            }

            // 處理數值欄位
            const percentage = item.percentage !== undefined && item.percentage !== null && item.percentage !== '' ? roundToTwoDecimals(Number(item.percentage)) : 0;
            let pgRatio = item.pgRatio !== undefined && item.pgRatio !== null && item.pgRatio !== '' ? roundToTwoDecimals(Number(item.pgRatio)) : 0;
            let vgRatio = item.vgRatio !== undefined && item.vgRatio !== null && item.vgRatio !== '' ? roundToTwoDecimals(Number(item.vgRatio)) : 0;
            const currentStock = item.currentStock !== undefined && item.currentStock !== null && item.currentStock !== '' ? Number(item.currentStock) : 0;
            const safetyStockLevel = item.safetyStockLevel !== undefined && item.safetyStockLevel !== null && item.safetyStockLevel !== '' ? Number(item.safetyStockLevel) : 0;
            const costPerUnit = item.costPerUnit !== undefined && item.costPerUnit !== null && item.costPerUnit !== '' ? Number(item.costPerUnit) : 0;
            
            // 如果提供了香精比例但沒有提供 PG/VG 比例，則自動計算
            if (percentage > 0 && (pgRatio === 0 || vgRatio === 0)) {
              const calculatedRatios = calculatePGRatios(percentage);
              pgRatio = calculatedRatios.pgRatio;
              vgRatio = calculatedRatios.vgRatio;
              
              console.log(`自動計算香精 ${item.name} 的比例:`, {
                fragrancePercentage: percentage,
                calculatedPgRatio: pgRatio,
                calculatedVgRatio: vgRatio
              });
            }
            
            const processedItem: any = {
              code: item.code,
              name: item.name,
              supplierId,
              percentage,
              pgRatio,
              vgRatio,
              currentStock,
              safetyStockLevel,
              costPerUnit,
              unit: 'KG' // 固定單位為KG
            };
            
            // 處理香精種類 - 即使為空也要傳遞，讓後端處理預設值
            processedItem.fragranceType = fragranceType;
            
            // 處理啟用狀態 - 即使為空也要傳遞，讓後端處理預設值
            processedItem.fragranceStatus = fragranceStatus;

            // 調試日誌：檢查處理後的資料
            console.log(`處理香精 ${item.name} 的完整資料:`, {
              code: processedItem.code,
              name: processedItem.name,
              supplierId: processedItem.supplierId,
              fragranceType: processedItem.fragranceType,
              fragranceStatus: processedItem.fragranceStatus,
              percentage: processedItem.percentage,
              pgRatio: processedItem.pgRatio,
              vgRatio: processedItem.vgRatio,
              currentStock: processedItem.currentStock,
              safetyStockLevel: processedItem.safetyStockLevel,
              costPerUnit: processedItem.costPerUnit,
              unit: processedItem.unit
            });

            // 調試日誌：檢查原始和處理後的資料對比
            console.log(`處理香精 ${item.name} 的資料對比:`, {
              originalFragranceType: item.fragranceType,
              processedFragranceType: fragranceType,
              originalFragranceStatus: item.fragranceStatus,
              processedFragranceStatus: fragranceStatus,
              originalSupplierName: item.supplierName,
              processedSupplierId: supplierId,
              hasSupplierId: !!supplierId,
              originalCurrentStock: item.currentStock,
              processedCurrentStock: currentStock,
              originalPercentage: item.percentage,
              processedPercentage: percentage,
              // 添加更詳細的調試信息
              fragranceTypeExists: !!item.fragranceType,
              fragranceStatusExists: !!item.fragranceStatus,
              fragranceTypeLength: item.fragranceType?.length || 0,
              fragranceStatusLength: item.fragranceStatus?.length || 0
            });
            
            // 智能匹配邏輯：檢查香精代號是否存在
            const existingFragranceId = existingFragrancesMap.get(item.code);
            
            if (existingFragranceId) {
              // 香精代號已存在，執行更新
              console.log(`香精代號 ${item.code} 已存在，執行更新操作`);
              const updateFragrance = httpsCallable(functions, 'updateFragranceByCode');
              await updateFragrance(processedItem);
              updatedCount++;
            } else {
              // 香精代號不存在，執行新增
              console.log(`香精代號 ${item.code} 不存在，執行新增操作`);
              const createFragrance = httpsCallable(functions, 'createFragrance');
              await createFragrance(processedItem);
              createdCount++;
            }
          } catch (error) {
            console.error('處理香精資料失敗:', error);
            throw error;
          }
        }
        
        processedCount += batch.length;
        onProgress?.(processedCount, data.length);
        
        // 每批之間稍作延遲，避免過度負載
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('香精匯入結果:', `成功處理 ${processedCount} 筆資料 (新增: ${createdCount}, 更新: ${updatedCount})`);
      loadData();
    } catch (error) {
      console.error('匯入香精失敗:', error);
      throw error;
    }
  };

  const handleExport = async () => {
    return fragrances.map(fragrance => {
      // 將英文的香精種類轉換為中文（如果資料庫中還是英文的話）
      const getFragranceTypeText = (type: string) => {
        switch (type) {
          case 'cotton':
            return '棉芯';
          case 'ceramic':
            return '陶瓷芯';
          case 'universal':
            return '棉陶芯通用';
          default:
            return type; // 如果已經是中文，直接返回
        }
      };

      // 將英文的啟用狀態轉換為中文（如果資料庫中還是英文的話）
      const getFragranceStatusText = (status: string) => {
        switch (status) {
          case 'active':
            return '啟用';
          case 'standby':
            return '備用';
          case 'discontinued':
            return '棄用';
          default:
            return status; // 如果已經是中文，直接返回
        }
      };

      return {
        code: fragrance.code,
        name: fragrance.name,
        fragranceType: getFragranceTypeText(fragrance.fragranceType || fragrance.status),
        fragranceStatus: getFragranceStatusText(fragrance.fragranceStatus || fragrance.status || 'active'),
        supplierName: fragrance.supplierName,
        safetyStockLevel: fragrance.safetyStockLevel,
        costPerUnit: fragrance.costPerUnit,
        percentage: fragrance.percentage,
        pgRatio: fragrance.pgRatio,
        vgRatio: fragrance.vgRatio,
        currentStock: fragrance.currentStock,
        unit: 'KG'
      };
    });
  };

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewFragrances && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看香精管理頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 fragrances-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            配方庫
          </h1>
          <p className="text-gray-600 mt-2">管理香精配方與庫存</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-2 gap-3">
          {isStocktakeMode ? (
            <>
              <Button onClick={handleSaveStocktake} className="w-full">
                <Package className="mr-2 h-4 w-4" />
                儲存盤點
              </Button>
              <Button variant="outline" onClick={handleCancelStocktake} className="w-full">
                取消
              </Button>
            </>
          ) : (
            <>
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  匯入/匯出
                </Button>
              )}
              <Button onClick={handleAddToPurchaseCart} disabled={purchaseCart.size === 0 || cartLoading} variant="outline" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                加入採購車 ({purchaseCart.size})
              </Button>
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsStocktakeMode(true)} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  盤點模式
                </Button>
              )}
              {canManageFragrances && (
                <Button 
                  onClick={handleAdd}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增香精
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {isStocktakeMode ? (
            <>
              <Button onClick={handleSaveStocktake}>
                <Package className="mr-2 h-4 w-4" />
                儲存盤點
              </Button>
              <Button variant="outline" onClick={handleCancelStocktake}>
                取消
              </Button>
            </>
          ) : (
            <>
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  匯入/匯出
                </Button>
              )}
              <Button onClick={handleAddToPurchaseCart} disabled={purchaseCart.size === 0 || cartLoading} variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                加入採購車 ({purchaseCart.size})
              </Button>
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsStocktakeMode(true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  盤點模式
                </Button>
              )}
              {canManageFragrances && (
                <Button 
                  onClick={handleAdd}
                  className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增香精
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 搜尋框 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-pink-600" />
            <Input
              placeholder="搜尋香精代號、名稱、供應商、香精種類、庫存等..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-pink-200 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          

        </CardContent>
      </Card>

      {/* 篩選標籤 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {/* 安全庫存標籤 */}
          {getLowStockCount() > 0 && (
            <Badge
              variant={showLowStockOnly ? "default" : "secondary"}
              className={`cursor-pointer transition-colors ${
                showLowStockOnly 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
              }`}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              安全庫存 ({getLowStockCount()})
            </Badge>
          )}

                      {/* 供應商標籤 - 橙色 */}
            {availableSuppliers.map(supplier => (
              <Badge
                key={supplier}
                variant={selectedSuppliers.has(supplier) ? "default" : "secondary"}
                className={`cursor-pointer transition-colors ${
                  selectedSuppliers.has(supplier) 
                    ? "bg-orange-600 hover:bg-orange-700 text-white" 
                    : "bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
                }`}
                onClick={() => {
                  setSelectedSuppliers(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(supplier)) {
                      newSet.delete(supplier);
                    } else {
                      newSet.add(supplier);
                    }
                    return newSet;
                  });
                }}
              >
                {supplier}
              </Badge>
            ))}

            {/* 香精種類標籤 - 紫色 */}
            {availableFragranceTypes.map(type => {
              const isSelected = selectedFragranceTypes.has(type);
              const getTypeColor = (type: string) => {
                switch (type) {
                  case '棉芯':
                    return isSelected 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300";
                  case '陶瓷芯':
                    return isSelected 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-green-100 hover:bg-green-200 text-green-800 border-green-300";
                  case '棉陶芯通用':
                    return isSelected 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300";
                  default:
                    return isSelected 
                      ? "bg-gray-600 hover:bg-gray-700 text-white" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300";
                }
              };
              
              return (
                <Badge
                  key={type}
                  variant={isSelected ? "default" : "secondary"}
                  className={`cursor-pointer transition-colors ${getTypeColor(type)}`}
                  onClick={() => {
                    setSelectedFragranceTypes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(type)) {
                        newSet.delete(type);
                      } else {
                        newSet.add(type);
                      }
                      return newSet;
                    });
                  }}
                >
                  {type}
                </Badge>
              );
            })}
        </div>
      </div>

      {/* 購物車操作按鈕 - 只有當有項目被勾選時才顯示 */}
      {purchaseCart.size > 0 && !isStocktakeMode && (
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToPurchaseCart}
              disabled={cartLoading}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              加入採購車 ({purchaseCart.size})
            </Button>
            {canManageFragrances && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                批量刪除 ({purchaseCart.size})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-pink-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-pink-600" />
                <h2 className="text-base font-semibold text-gray-800">香精清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {filteredFragrances.length} 項
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-pink-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-pink-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : filteredFragrances.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredFragrances.map((fragrance) => {
                    const isLowStock = typeof fragrance.safetyStockLevel === 'number' && fragrance.currentStock < fragrance.safetyStockLevel;
                    return (
                      <div 
                        key={fragrance.id} 
                        className={`p-4 ${isLowStock && !isStocktakeMode ? 'bg-red-50/50' : ''} hover:bg-pink-50/50 transition-colors duration-200`}
                        onClick={() => handleViewDetail(fragrance)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                              <Droplets className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                                              <div className="font-medium text-gray-900 text-sm">{fragrance.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    {fragrance.code}
                                  </span>
                                </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={purchaseCart.has(fragrance.id)}
                              onCheckedChange={() => handleCartToggle(fragrance.id)}
                              aria-label={`選擇 ${fragrance.name}`}
                              disabled={isStocktakeMode}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isStocktakeMode}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => addToPurchaseCart(fragrance)}
                                  disabled={cartLoading}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  加入採購車
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewDetail(fragrance)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  查看詳細
                                </DropdownMenuItem>
                                {canManageFragrances && (
                                  <DropdownMenuItem onClick={() => handleEdit(fragrance)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    編輯
                                  </DropdownMenuItem>
                                )}
                                {canManageFragrances && (
                                  <DropdownMenuItem onClick={() => handleDelete(fragrance)} className="text-red-600">刪除</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {!isStocktakeMode && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Building className="h-3 w-3 text-blue-600" />
                                <span className="text-gray-500">供應商</span>
                              </div>
                              <span className="font-medium text-gray-700">{fragrance.supplierName}</span>
                            </div>
                          )}
                          {!isStocktakeMode && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">香精種類</span>
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                fragrance.fragranceType === '棉芯' ? 'bg-blue-100 text-blue-800' :
                                fragrance.fragranceType === '陶瓷芯' ? 'bg-green-100 text-green-800' :
                                fragrance.fragranceType === '棉陶芯通用' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {fragrance.fragranceType || '未指定'}
                              </span>
                            </div>
                          )}
                          {!isStocktakeMode && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">啟用狀態</span>
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                fragrance.fragranceStatus === '啟用' ? 'bg-green-100 text-green-800' :
                                fragrance.fragranceStatus === '備用' ? 'bg-yellow-100 text-yellow-800' :
                                fragrance.fragranceStatus === '棄用' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {fragrance.fragranceStatus || '未指定'}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Warehouse className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-500">{isStocktakeMode ? "應有庫存:" : "目前庫存:"}</span>
                            </div>
                            {isStocktakeMode ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">
                                  {fragrance.currentStock || 0} KG
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {isLowStock && (
                                  <AlertTriangle className="h-3 w-3 text-red-600" />
                                )}
                                                                  <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                    {fragrance.currentStock} KG
                                  </span>
                              </div>
                            )}
                          </div>
                          {isStocktakeMode && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">現有庫存:</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20 h-7 text-sm border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                                  value={updatedStocks[fragrance.id] ?? fragrance.currentStock}
                                  onChange={(e) => handleStockChange(fragrance.id, Number(e.target.value))}
                                />
                                                                  <span className="text-xs text-gray-600">KG</span>
                              </div>
                            </div>
                          )}
                          {!isStocktakeMode && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">安全庫存</span>
                              </div>
                                                              <span className="font-medium text-gray-700">
                                  {fragrance.safetyStockLevel || 0} KG
                                </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Droplets className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-1">沒有香精資料</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">開始建立第一個香精來管理配方</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-pink-200 text-pink-600 hover:bg-pink-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增香精
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-background to-accent/10 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {isStocktakeMode ? '香精盤點中' : '香精清單'}
              </h2>
            </div>
            <div className="text-sm text-muted-foreground">
              共 {filteredFragrances.length} 項香精
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">
                  {!isStocktakeMode && (
                    <div className="flex items-center gap-2" title="全選所有香精">
                      <Checkbox
                        checked={purchaseCart.size === filteredFragrances.length && filteredFragrances.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPurchaseCart(new Set(filteredFragrances.map(f => f.id)));
                          } else {
                            setPurchaseCart(new Set());
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">全選</span>
                    </div>
                  )}
                </TableHead>
                <TableHead className="text-left">香精資訊</TableHead>
                {!isStocktakeMode && <TableHead className="text-left">香精種類</TableHead>}
                {!isStocktakeMode && <TableHead className="text-left">啟用狀態</TableHead>}
                {!isStocktakeMode && <TableHead className="text-left">供應商</TableHead>}
                <TableHead className="text-right">{isStocktakeMode ? "應有庫存" : "目前庫存"}</TableHead>
                {isStocktakeMode && <TableHead className="text-right">現有庫存</TableHead>}
                {!isStocktakeMode && <TableHead className="text-right">安全庫存</TableHead>}
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-pink-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-pink-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-muted-foreground font-medium">載入香精資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredFragrances.length > 0 ? (
                filteredFragrances.map((fragrance) => {
                  const isLowStock = typeof fragrance.safetyStockLevel === 'number' && fragrance.currentStock < fragrance.safetyStockLevel;
                  return (
                    <TableRow 
                      key={fragrance.id} 
                      className={`${isLowStock && !isStocktakeMode ? 'bg-destructive/10' : ''} ${!isStocktakeMode ? 'cursor-pointer hover:bg-accent/5' : ''} transition-colors duration-200`} 
                      data-state={purchaseCart.has(fragrance.id) ? "selected" : ""}
                      onClick={!isStocktakeMode ? () => router.push(`/dashboard/fragrances/${fragrance.id}`) : undefined}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={purchaseCart.has(fragrance.id)}
                          onCheckedChange={() => handleCartToggle(fragrance.id)}
                          aria-label={`選擇 ${fragrance.name}`}
                          disabled={isStocktakeMode}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg flex items-center justify-center">
                            <Droplets className="h-4 w-4 text-white" />
                          </div>
                          <div>
                                                          <div className="font-medium text-foreground">{fragrance.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                  {fragrance.code}
                                </Badge>
                              </div>
                          </div>
                        </div>
                      </TableCell>
                      {!isStocktakeMode && (
                        <TableCell>
                          <Badge className={`status-badge ${
                            fragrance.fragranceType === '棉芯' ? 'bg-blue-100 text-blue-800' :
                            fragrance.fragranceType === '陶瓷芯' ? 'bg-green-100 text-green-800' :
                            fragrance.fragranceType === '棉陶芯通用' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {fragrance.fragranceType || '未指定'}
                          </Badge>
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell>
                          <Badge className={`status-badge ${
                            fragrance.fragranceStatus === '啟用' ? 'bg-green-100 text-green-800' :
                            fragrance.fragranceStatus === '備用' ? 'bg-yellow-100 text-yellow-800' :
                            fragrance.fragranceStatus === '棄用' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {fragrance.fragranceStatus || '未指定'}
                          </Badge>
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{fragrance.supplierName}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {isStocktakeMode ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="number-display number-neutral">
                              {fragrance.currentStock || 0} KG
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`text-lg font-bold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                              {fragrance.currentStock} KG
                            </span>
                          </div>
                        )}
                      </TableCell>
                      {isStocktakeMode && (
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              type="number"
                              className="w-24 h-8 text-right border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                              value={updatedStocks[fragrance.id] ?? fragrance.currentStock}
                              onChange={(e) => handleStockChange(fragrance.id, Number(e.target.value))}
                            />
                            <span className="text-sm text-gray-600">KG</span>
                          </div>
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="number-display number-neutral">
                              {fragrance.safetyStockLevel || 0} KG
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isStocktakeMode}>
                              <span className="sr-only">開啟選單</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => addToPurchaseCart(fragrance)}
                              disabled={cartLoading}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              加入採購車
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewDetail(fragrance)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看詳細
                            </DropdownMenuItem>
                            {canManageFragrances && (
                              <DropdownMenuItem onClick={() => handleEdit(fragrance)}>
                                <Edit className="h-4 w-4 mr-2" />
                                編輯香精
                              </DropdownMenuItem>
                            )}
                            {canManageFragrances && <DropdownMenuSeparator />}
                            {canManageFragrances && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(fragrance)}
                                className="text-red-600 focus:text-red-600"
                              >
                                刪除香精
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Droplets className="h-8 w-8 text-muted-foreground" />
                      </div>
                                              <h3 className="text-lg font-medium text-foreground mb-2">沒有香精資料</h3>
                        <p className="text-muted-foreground mb-4">開始建立第一個香精來管理配方</p>
                      {canManageFragrances && (
                        <Button 
                          onClick={handleAdd}
                          variant="outline"
                          className="border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          新增香精
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
        </div>
      </div>
      </div>

      <FragranceDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onFragranceUpdate={loadData}
        fragranceData={selectedFragrance}
      />

      {selectedFragrance && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除香精`}
          description={`您確定要永久刪除香精「${selectedFragrance.name}」嗎？此操作無法復原。`}
        />
      )}

      <ConfirmDialog
        isOpen={isBatchDeleteOpen}
        onOpenChange={setIsBatchDeleteOpen}
        onConfirm={handleConfirmBatchDelete}
        title="確認批量刪除"
        description={`您確定要永久刪除選中的 ${purchaseCart.size} 個香精嗎？此操作無法復原。`}
      />

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={handleImport}
        onExport={handleExport}
        title="香精資料"
        description="匯入或匯出香精資料，支援 Excel 和 CSV 格式。匯入時會智能匹配香精代號：如果代號不存在則新增，如果代號已存在則更新覆蓋有填入的欄位。"
        color="purple"
        showUpdateOption={false}
        maxBatchSize={500}
        sampleData={[
          {
            code: "FRAG001",
            name: "示例香精",
            fragranceType: "棉芯",
            fragranceStatus: "啟用",
            supplierName: "示例供應商",
            safetyStockLevel: 1000,
            costPerUnit: 15.5,
            percentage: 5,
            currentStock: 500,
            unit: "KG"
          }
        ]}
        fields={[
          { key: "code", label: "香精代號", required: false, type: "string" },
          { key: "name", label: "香精名稱", required: true, type: "string" },
          { key: "fragranceType", label: "香精種類", required: false, type: "string" },
          { key: "fragranceStatus", label: "啟用狀態", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "percentage", label: "香精比例", required: false, type: "number" },
          { key: "pgRatio", label: "PG比例", required: false, type: "number" },
          { key: "vgRatio", label: "VG比例", required: false, type: "number" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" }
        ]}
      />

      {selectedDetailFragrance && (
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailFragrance.name}
          subtitle={`代號: ${selectedDetailFragrance.code}`}
          sections={[
            {
              title: "基本資訊",
              icon: <Droplets className="h-4 w-4" />,
              fields: [
                { label: "香精代號", value: selectedDetailFragrance.code },
                { label: "香精名稱", value: selectedDetailFragrance.name },
                { label: "供應商", value: selectedDetailFragrance.supplierName },
                { label: "香精種類", value: selectedDetailFragrance.fragranceType === 'cotton' ? '棉芯' :
                   selectedDetailFragrance.fragranceType === 'ceramic' ? '陶瓷芯' :
                   selectedDetailFragrance.fragranceType === 'universal' ? '棉陶芯通用' : '未指定' },
              ]
            },
            {
              title: "庫存資訊",
              icon: <Warehouse className="h-4 w-4" />,
              fields: [
                { label: "目前庫存", value: selectedDetailFragrance.currentStock, type: "number" },
                { label: "安全庫存", value: selectedDetailFragrance.safetyStockLevel, type: "number" },
                { label: "單位成本", value: selectedDetailFragrance.costPerUnit, type: "currency" },
              ]
            },
            {
              title: "配方資訊",
              icon: <Calculator className="h-4 w-4" />,
              fields: [
                { label: "濃度百分比", value: selectedDetailFragrance.percentage, type: "number" },
                { label: "PG比例", value: selectedDetailFragrance.pgRatio, type: "number" },
                { label: "VG比例", value: selectedDetailFragrance.vgRatio, type: "number" },
              ]
            }
          ]}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsDetailViewOpen(false)}>
                關閉
              </Button>
              <Button onClick={() => {
                setIsDetailViewOpen(false);
                handleEdit(selectedDetailFragrance);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}


export default function FragrancesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FragrancesPageContent />
    </Suspense>
  );
}
