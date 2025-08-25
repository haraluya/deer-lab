'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { getCategoryIcon, generateRandomBgColor } from '@/lib/utils';

import { MaterialDialog, MaterialData } from './MaterialDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, ShoppingCart, ListChecks, Save, X, Loader2, Search, FileSpreadsheet, Eye, Edit, Warehouse, Building, Tag, Package, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// 擴展 MaterialData 以包含解析後的供應商名稱
interface MaterialWithSupplier extends MaterialData {
  supplierName: string;
  refPath: string; // 確保文檔路徑存在
  bgColor: string; // 添加背景顏色
}

function MaterialsPageContent() {
  const router = useRouter();

  const [materials, setMaterials] = useState<MaterialWithSupplier[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);
  const [purchaseCart, setPurchaseCart] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // --- 盤點功能相關狀態 ---
  const [isStocktakeMode, setIsStocktakeMode] = useState(false);
  const [updatedStocks, setUpdatedStocks] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailMaterial, setSelectedDetailMaterial] = useState<MaterialWithSupplier | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  // -------------------------

  const fetchSuppliers = useCallback(async () => {
    const suppliersMap = new Map<string, string>();
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const querySnapshot = await getDocs(collection(db, "suppliers"));
      querySnapshot.forEach((doc) => {
        suppliersMap.set(doc.id, doc.data().name);
      });
    } catch (error) {
      console.error("Failed to fetch suppliers for mapping:", error);
    }
    return suppliersMap;
  }, []);

  const fetchMaterials = useCallback(async (suppliersMap: Map<string, string>) => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const materialsCollectionRef = collection(db, 'materials');
      const materialsSnapshot = await getDocs(materialsCollectionRef);
      
      const materialsList = materialsSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const supplierRef = data.supplierRef as DocumentReference | undefined;
        const supplierName = supplierRef ? suppliersMap.get(supplierRef.id) || '讀取失敗' : '未指定';
        
        return {
          id: doc.id,
          refPath: doc.ref.path,
          code: data.code,
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          supplierRef: data.supplierRef,
          supplierName,
          safetyStockLevel: data.safetyStockLevel || 0,
          costPerUnit: data.costPerUnit || 0,
          unit: data.unit,
          currentStock: data.currentStock || 0,
          notes: data.notes,
          bgColor: generateRandomBgColor(), // 為每個物料生成隨機背景顏色
        };
      }) as MaterialWithSupplier[];
      
      setMaterials(materialsList);
      setFilteredMaterials(materialsList);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      toast.error("讀取物料資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 檢查是否低於安全庫存
  const isLowStock = (material: MaterialWithSupplier) => {
    return (material.currentStock || 0) < (material.safetyStockLevel || 0);
  };

  // 獲取卡片背景顏色（低庫存時顯示淡粉色）
  const getCardBgColor = (material: MaterialWithSupplier) => {
    if (isLowStock(material)) {
      return 'bg-pink-50 border-pink-200 hover:bg-pink-100';
    }
    return 'bg-white border-gray-200 hover:bg-gray-50';
  };

  // 處理查看詳情
  const handleViewDetail = (material: MaterialWithSupplier) => {
    setSelectedDetailMaterial(material);
    setIsDetailViewOpen(true);
  };

  // 處理編輯
  const handleEdit = (material: MaterialData) => {
    setSelectedMaterial(material);
    setIsDialogOpen(true);
  };

  // 處理刪除
  const handleDelete = (material: MaterialData) => {
    setSelectedMaterial(material);
    setIsConfirmOpen(true);
  };

  // 處理確認刪除
  const handleConfirmDelete = async () => {
    if (!selectedMaterial) return;

    try {
      const functions = getFunctions();
      const deleteMaterial = httpsCallable(functions, 'deleteMaterial');
      await deleteMaterial({ materialId: selectedMaterial.id });
      
      toast.success(`物料 ${selectedMaterial.name} 已成功刪除。`);
      const suppliersMap = await fetchSuppliers();
      await fetchMaterials(suppliersMap);
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('刪除物料時發生錯誤。');
    } finally {
      setIsConfirmOpen(false);
      setSelectedMaterial(null);
    }
  };

  // 處理搜尋
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredMaterials(materials);
    } else {
      const filtered = materials.filter(material =>
        material.name.toLowerCase().includes(term.toLowerCase()) ||
        material.code.toLowerCase().includes(term.toLowerCase()) ||
        material.category?.toLowerCase().includes(term.toLowerCase()) ||
        material.subCategory?.toLowerCase().includes(term.toLowerCase()) ||
        material.supplierName.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredMaterials(filtered);
    }
  };

  // 處理新增物料
  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsDialogOpen(true);
  };

  // 處理物料更新
  const handleMaterialUpdate = async () => {
    const suppliersMap = await fetchSuppliers();
    await fetchMaterials(suppliersMap);
  };

  useEffect(() => {
    const loadData = async () => {
      const suppliersMap = await fetchSuppliers();
      await fetchMaterials(suppliersMap);
    };
    loadData();
  }, [fetchMaterials, fetchSuppliers]);

  // 載入骨架屏
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">物料管理</h1>
          <p className="text-gray-600 mt-1">管理系統中的所有物料資料</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setIsImportExportOpen(true)}
            variant="outline"
            className="border-green-200 text-green-600 hover:bg-green-50"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            匯入/匯出
          </Button>
          
          <Button
            onClick={handleAdd}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <Package className="mr-2 h-4 w-4" />
            新增物料
          </Button>
        </div>
      </div>

      {/* 搜尋欄 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="搜尋物料名稱、代號、分類或供應商..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 物料卡片網格 */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMaterials.map((material) => (
            <Card 
              key={material.id} 
              className={`cursor-pointer transition-all duration-200 ${getCardBgColor(material)}`}
              onClick={() => handleViewDetail(material)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${material.bgColor} rounded-lg flex items-center justify-center text-2xl`}>
                      {getCategoryIcon(material.category || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {material.name}
                      </CardTitle>
                      <CardDescription className="text-sm font-mono text-gray-600">
                        {material.code}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(material); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        查看詳情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(material); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        編輯
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleDelete(material); }}
                        className="text-red-600"
                      >
                        <X className="mr-2 h-4 w-4" />
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">分類</span>
                  <Badge variant="secondary" className="text-xs">
                    {material.category} / {material.subCategory}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">供應商</span>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {material.supplierName}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">庫存</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isLowStock(material) ? 'text-red-600' : 'text-green-600'}`}>
                      {material.currentStock} {material.unit}
                    </span>
                    {isLowStock(material) && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">成本</span>
                  <span className="text-sm font-medium">
                    ${material.costPerUnit?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有物料資料</h3>
          <p className="text-gray-500 mb-4">開始新增第一個物料來管理您的庫存</p>
          <Button onClick={handleAdd} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
            <Package className="mr-2 h-4 w-4" />
            新增物料
          </Button>
        </div>
      )}

      {/* 物料對話框 */}
      <MaterialDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onMaterialUpdate={handleMaterialUpdate}
        materialData={selectedMaterial}
      />

      {/* 詳情對話框 */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              物料詳情
            </DialogTitle>
          </DialogHeader>
          
          {selectedDetailMaterial && (
            <div className="space-y-6">
              {/* 基本資訊 */}
              <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                  <Tag className="h-4 w-4" />
                  基本資訊
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">物料名稱</label>
                    <p className="text-sm font-semibold">{selectedDetailMaterial.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">物料代號</label>
                    <p className="text-sm font-mono">{selectedDetailMaterial.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">主分類</label>
                    <p className="text-sm">{selectedDetailMaterial.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">細分分類</label>
                    <p className="text-sm">{selectedDetailMaterial.subCategory}</p>
                  </div>
                </div>
              </div>

              {/* 供應商資訊 */}
              <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-green-800">
                  <Building className="h-4 w-4" />
                  供應商資訊
                </h3>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">供應商</label>
                  <p className="text-sm">{selectedDetailMaterial.supplierName}</p>
                </div>
              </div>

              {/* 庫存與成本 */}
              <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-800">
                  <Shield className="h-4 w-4" />
                  庫存與成本
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">當前庫存</label>
                    <p className={`text-sm font-semibold ${isLowStock(selectedDetailMaterial) ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedDetailMaterial.currentStock} {selectedDetailMaterial.unit}
                      {isLowStock(selectedDetailMaterial) && (
                        <AlertTriangle className="inline h-3 w-3 ml-1" />
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">安全庫存</label>
                    <p className="text-sm">{selectedDetailMaterial.safetyStockLevel} {selectedDetailMaterial.unit}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">單位成本</label>
                    <p className="text-sm">${selectedDetailMaterial.costPerUnit?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">單位</label>
                    <p className="text-sm">{selectedDetailMaterial.unit}</p>
                  </div>
                </div>
              </div>

              {/* 備註 */}
              {selectedDetailMaterial.notes && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-yellow-800">
                    <Package className="h-4 w-4" />
                    備註
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedDetailMaterial.notes}</p>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailViewOpen(false)}
                >
                  關閉
                </Button>
                <Button 
                  onClick={() => {
                    setIsDetailViewOpen(false);
                    handleEdit(selectedDetailMaterial);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  編輯
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 確認刪除對話框 */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        description={`您確定要刪除物料「${selectedMaterial?.name}」嗎？此操作無法復原。`}
      />

      {/* 匯入匯出對話框 */}
      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={async (data: any[]) => {
          const functions = getFunctions();
          const createMaterial = httpsCallable(functions, 'createMaterial');
          
          for (const item of data) {
            try {
              await createMaterial(item);
            } catch (error) {
              console.error('匯入物料失敗:', error);
              throw error;
            }
          }
          handleMaterialUpdate();
        }}
        onExport={async () => {
          return materials.map(material => ({
            code: material.code,
            name: material.name,
            category: material.category,
            subCategory: material.subCategory,
            supplierName: material.supplierName,
            safetyStockLevel: material.safetyStockLevel,
            costPerUnit: material.costPerUnit,
            unit: material.unit,
            currentStock: material.currentStock,
            notes: material.notes
          }));
        }}
        title="物料資料"
        description="匯入或匯出物料資料，支援 Excel 和 CSV 格式"
        sampleData={[
          {
            code: "MAT001",
            name: "示例物料",
            category: "原料",
            subCategory: "基礎原料",
            supplierName: "示例供應商",
            safetyStockLevel: 100,
            costPerUnit: 10.5,
            unit: "kg",
            currentStock: 50,
            notes: "示例備註"
          }
        ]}
        fields={[
          { key: "code", label: "物料代號", required: true, type: "string" },
          { key: "name", label: "物料名稱", required: true, type: "string" },
          { key: "category", label: "分類", required: false, type: "string" },
          { key: "subCategory", label: "子分類", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "notes", label: "備註", required: false, type: "string" }
        ]}
      />
    </div>
  );
}

export default MaterialsPageContent;
