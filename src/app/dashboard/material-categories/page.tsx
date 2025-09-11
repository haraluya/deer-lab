'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDataSearch } from '@/hooks/useDataSearch';
import { generateCategoryId, generateSubCategoryId } from '@/lib/utils';

import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tag, Calendar, MoreHorizontal, Eye, Package, ArrowLeft, Layers, Hash, Building } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardDataListPage, StandardColumn, StandardAction, StandardStats, QuickFilter } from '@/components/StandardDataListPage';
import { MaterialCategoryDialog } from '../materials/MaterialCategoryDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  type: 'category' | 'subCategory';
  usageCount: number;
  generatedId?: string;
  displayType: string;
}

export default function MaterialCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // 搜尋配置
  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof Category },
      { key: 'generatedId' as keyof Category },
      { key: 'displayType' as keyof Category }
    ],
    filterConfigs: [
      {
        key: 'type' as keyof Category,
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
    filteredData: filteredCategories,
    totalCount,
    filteredCount
  } = useDataSearch(categories, searchConfig);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error('Firebase 未初始化');
      }
      
      const categoriesList: Category[] = [];
      
      // 從物料資料中提取分類和細分分類的使用統計
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      const categoryMap = new Map<string, { count: number, id?: string }>();
      const subCategoryMap = new Map<string, { count: number, id?: string }>();
      
      materialsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          const existing = categoryMap.get(data.category) || { count: 0, id: data.mainCategoryId };
          existing.count += 1;
          if (data.mainCategoryId) existing.id = data.mainCategoryId;
          categoryMap.set(data.category, existing);
        }
        if (data.subCategory) {
          const existing = subCategoryMap.get(data.subCategory) || { count: 0, id: data.subCategoryId };
          existing.count += 1;
          if (data.subCategoryId) existing.id = data.subCategoryId;
          subCategoryMap.set(data.subCategory, existing);
        }
      });

      // 從 Firestore 讀取主分類
      try {
        const categoriesSnapshot = await getDocs(collection(db, 'materialCategories'));
        categoriesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const usageCount = categoryMap.get(data.name)?.count || 0;
          categoriesList.push({
            id: doc.id,
            name: data.name,
            type: 'category',
            usageCount,
            generatedId: data.id || generateCategoryId(),
            displayType: '主分類'
          });
        });
      } catch (error) {
        console.log('主分類集合不存在，跳過');
      }
      
      // 從 Firestore 讀取細分分類
      try {
        const subCategoriesSnapshot = await getDocs(collection(db, 'materialSubCategories'));
        subCategoriesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const usageCount = subCategoryMap.get(data.name)?.count || 0;
          categoriesList.push({
            id: doc.id,
            name: data.name,
            type: 'subCategory',
            usageCount,
            generatedId: data.id || generateSubCategoryId(),
            displayType: '細分分類'
          });
        });
      } catch (error) {
        console.log('細分分類集合不存在，跳過');
      }

      // 分開排序：先主分類再細分分類，各自按名稱排序
      const mainCategories = categoriesList
        .filter(cat => cat.type === 'category')
        .sort((a, b) => a.name.localeCompare(b.name));
      const subCategories = categoriesList
        .filter(cat => cat.type === 'subCategory')
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setCategories([...mainCategories, ...subCategories]);
    } catch (error) {
      console.error('載入分類失敗:', error);
      toast.error('載入分類失敗');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 配置欄位
  const columns: StandardColumn<Category>[] = [
    {
      key: 'name',
      title: '分類資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            record.type === 'category' 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
              : 'bg-gradient-to-br from-green-500 to-emerald-600'
          }`}>
            {record.type === 'category' ? (
              <Tag className="h-5 w-5 text-white" />
            ) : (
              <Package className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <div className="font-semibold text-foreground">{record.name}</div>
            <div className="text-xs text-gray-500">{record.displayType}</div>
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.name}</div>
          <div className="text-xs text-gray-500">{record.displayType}</div>
        </div>
      )
    },
    {
      key: 'generatedId',
      title: '分類代號',
      sortable: true,
      priority: 4,
      align: 'center',
      render: (value) => (
        <Badge className="bg-gray-100 text-gray-700 border-gray-300 font-mono">
          {value || '待生成'}
        </Badge>
      )
    },
    {
      key: 'usageCount',
      title: '使用數量',
      sortable: true,
      priority: 3,
      align: 'center',
      render: (value) => (
        <div className="text-center">
          <span className="font-semibold text-foreground">{value}</span>
          <div className="text-xs text-gray-500">個物料</div>
        </div>
      ),
      mobileRender: (value) => (
        <div className="text-right">
          <span className="font-semibold text-foreground">{value}</span>
          <span className="text-xs text-gray-500 ml-1">物料</span>
        </div>
      )
    },
    {
      key: 'type',
      title: '分類類型',
      filterable: true,
      priority: 2,
      hideOnMobile: true,
      render: (value, record) => (
        <Badge className={`${
          record.type === 'category' 
            ? 'bg-blue-100 text-blue-800 border-blue-200' 
            : 'bg-green-100 text-green-800 border-green-200'
        }`}>
          {record.displayType}
        </Badge>
      )
    }
  ];

  // 配置操作
  const actions: StandardAction<Category>[] = [
    {
      key: 'edit',
      title: '編輯分類',
      icon: <Edit className="h-4 w-4" />,
      onClick: (category) => {
        setSelectedCategory(category);
        setIsCategoryDialogOpen(true);
      }
    },
    {
      key: 'delete',
      title: '刪除分類',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      confirmMessage: '確定要刪除此分類嗎？此操作無法復原。',
      onClick: (category) => {
        setSelectedCategory(category);
        setIsConfirmOpen(true);
      }
    }
  ];

  // 配置快速篩選
  const quickFilters: QuickFilter[] = useMemo(() => [
    {
      key: 'type',
      label: '主分類',
      value: 'category',
      count: categories.filter(c => c.type === 'category').length,
      color: 'blue'
    },
    {
      key: 'type',
      label: '細分分類',
      value: 'subCategory',
      count: categories.filter(c => c.type === 'subCategory').length,
      color: 'green'
    }
  ], [categories]);

  // 配置統計資料
  const stats: StandardStats[] = useMemo(() => {
    const mainCategoriesCount = categories.filter(c => c.type === 'category').length;
    const subCategoriesCount = categories.filter(c => c.type === 'subCategory').length;
    const totalUsage = categories.reduce((sum, c) => sum + c.usageCount, 0);
    const activeCategories = categories.filter(c => c.usageCount > 0).length;

    return [
      {
        title: '總分類數',
        value: categories.length,
        subtitle: '所有分類',
        icon: <Tag className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '主分類',
        value: mainCategoriesCount,
        subtitle: '主要分類',
        icon: <Layers className="h-4 w-4" />,
        color: 'purple'
      },
      {
        title: '細分分類',
        value: subCategoriesCount,
        subtitle: '細分分類',
        icon: <Package className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '總使用量',
        value: totalUsage,
        subtitle: '物料關聯數',
        icon: <Building className="h-4 w-4" />,
        color: 'orange'
      }
    ];
  }, [categories]);

  // 操作處理函式
  const handleAdd = () => {
    setSelectedCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory || !db) {
      toast.error('系統錯誤：資料庫未初始化');
      return;
    }

    const toastId = toast.loading('正在刪除分類...');
    try {
      const collectionName = selectedCategory.type === 'category' 
        ? 'materialCategories' 
        : 'materialSubCategories';
      
      await deleteDoc(doc(db, collectionName, selectedCategory.id));
      toast.success(`分類 ${selectedCategory.name} 已成功刪除。`, { id: toastId });
      loadCategories();
    } catch (error) {
      console.error('刪除分類失敗:', error);
      toast.error('刪除分類失敗', { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedCategory(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題區域 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/dashboard/materials')}
          className="hover:bg-blue-100 hover:border-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            物料分類管理
          </h1>
          <p className="text-gray-600 mt-2">管理物料分類與細分分類</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredCategories}
        loading={isLoading}
        columns={columns}
        actions={actions}
        
        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋分類名稱、代號或類型..."
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
        
        // 新增功能 - 改為"新增分類"
        showAddButton={true}
        addButtonText="新增分類"
        onAdd={handleAdd}
        
        // 自定義卡片渲染以提高資訊密度
        renderCard={(record, index) => (
          <div
            className={`
              bg-gradient-to-br from-white to-gray-50/30 border border-gray-100
              rounded-lg p-4 hover:shadow-md transition-all duration-200
              hover:border-gray-300 hover:bg-gray-50/50
              min-h-[140px] flex flex-col justify-between
            `}
          >
            {/* 頂部：主要資訊 */}
            <div className="space-y-3">
              {/* 標題行 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    record.type === 'category' 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                    {record.type === 'category' ? (
                      <Tag className="h-5 w-5 text-white" />
                    ) : (
                      <Package className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                      {record.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {record.displayType}
                    </p>
                  </div>
                </div>
                
                {/* 操作菜單 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 可以添加快速操作菜單
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
              
              {/* 關鍵信息標籤 */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-gray-100 text-gray-700 border-gray-300 font-mono text-xs px-2 py-0.5">
                  {record.generatedId || '待生成'}
                </Badge>
                <div className="flex items-center gap-1 bg-blue-50 rounded px-2 py-0.5">
                  <Building className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700">
                    {record.usageCount} 物料
                  </span>
                </div>
                <Badge className={`${
                  record.type === 'category' 
                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                    : 'bg-green-100 text-green-800 border-green-200'
                } text-xs px-2 py-0.5`}>
                  {record.displayType}
                </Badge>
              </div>
            </div>
            
            {/* 底部：操作提示 */}
            <div className="border-t border-gray-100 pt-3 mt-3">
              <span className="text-xs text-gray-400">點擊查看詳情</span>
            </div>
          </div>
        )}
        
        className="space-y-6"
      />

      {/* 物料分類對話框 */}
      <MaterialCategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      />

      {/* 確認刪除對話框 */}
      {selectedCategory && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="確認刪除分類"
          description={`您確定要永久刪除分類「${selectedCategory.name}」嗎？此操作無法復原。`}
        />
      )}
    </div>
  );
}