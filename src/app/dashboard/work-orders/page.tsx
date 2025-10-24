"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy, where, limit, startAfter, DocumentSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { toast } from "sonner"
import { error } from "@/utils/logger"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePermission } from '@/hooks/usePermission'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage'
import { StandardStats } from '@/components/StandardStatsCard'
import { useDataSearch } from '@/hooks/useDataSearch'
import { Plus, Factory, Filter, Search, TrendingUp, Clock, CheckCircle, Package, AlertCircle, Shield, Eye, ExternalLink, List } from "lucide-react"

const ITEMS_PER_PAGE = 20;

export interface WorkOrderColumn {
  id: string
  code: string
  orderType?: 'product' | 'general'
  productName?: string
  seriesName?: string
  workItem?: string
  targetQuantity: number
  status: string
  createdAt: string
}

// 現代化狀態Badge組件
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "預報":
        return {
          className: "bg-gradient-to-r from-orange-200 to-orange-300 text-orange-800 border border-orange-200 shadow-sm",
          icon: "⏳"
        }
      case "進行":
        return {
          className: "bg-gradient-to-r from-green-200 to-green-300 text-green-800 border border-green-200 shadow-sm",
          icon: "🔄"
        }
      case "完工":
        return {
          className: "bg-gradient-to-r from-emerald-200 to-emerald-300 text-emerald-800 border border-emerald-200 shadow-sm",
          icon: "✅"
        }
      case "入庫":
        return {
          className: "bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border border-purple-200 shadow-sm",
          icon: "📦"
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

function WorkOrdersPageContent() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  
  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewWorkOrders = hasPermission('workOrders.view') || hasPermission('workOrders:view');
  const canManageWorkOrders = hasPermission('workOrders.manage') || hasPermission('workOrders:manage') || hasPermission('workOrders:create') || hasPermission('workOrders:edit');

  // 使用統一的搜尋過濾 Hook
  const searchConfig = {
    searchFields: [
      { key: 'code' as keyof WorkOrderColumn },
      { key: 'productName' as keyof WorkOrderColumn },
      { key: 'seriesName' as keyof WorkOrderColumn }
    ],
    filterConfigs: [
      {
        key: 'status' as keyof WorkOrderColumn,
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
    filteredData: filteredWorkOrders,
    totalCount,
    filteredCount
  } = useDataSearch(workOrders, searchConfig);

  // 分離初始載入和分頁載入函數，避免循環依賴
  const loadInitialWorkOrders = useCallback(async () => {
    setLoading(true)
    setWorkOrders([])
    setLastDoc(null)
    setHasMore(true)
    
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const workOrdersQuery = query(
        collection(db, "workOrders"),
        orderBy("createdAt", "desc"),
        limit(ITEMS_PER_PAGE)
      );
      
      const querySnapshot = await getDocs(workOrdersQuery)
      
      const workOrdersList = querySnapshot.docs.map(doc => {
        const data = doc.data()
        const orderType = data.orderType || 'product' // 預設為產品工單（向後相容）
        return {
          id: doc.id,
          code: data.code || "",
          orderType: orderType,
          productName: orderType === 'product' ? (data.productSnapshot?.name || "未知產品") : undefined,
          seriesName: orderType === 'product' ? (data.productSnapshot?.seriesName || "未指定") : undefined,
          workItem: orderType === 'general' ? (data.workItem || "未命名工作") : undefined,
          targetQuantity: data.targetQuantity || 0,
          status: data.status || "預報",
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || "未知日期"
        }
      }) as WorkOrderColumn[]
      
      setWorkOrders(workOrdersList)
      
      // 更新分頁狀態
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]
      setLastDoc(lastVisible || null)
      setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE)
      
    } catch (err) {
      error("讀取工單資料失敗", err as Error)
      toast.error("讀取工單資料失敗")
    } finally {
      setLoading(false)
    }
  }, [])

  // 載入更多工單
  const loadMoreWorkOrders = useCallback(async () => {
    if (!lastDoc || !hasMore || loadingMore) return
    
    setLoadingMore(true)
    
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const workOrdersQuery = query(
        collection(db, "workOrders"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(ITEMS_PER_PAGE)
      );
      
      const querySnapshot = await getDocs(workOrdersQuery)
      
      const workOrdersList = querySnapshot.docs.map(doc => {
        const data = doc.data()
        const orderType = data.orderType || 'product' // 預設為產品工單（向後相容）
        return {
          id: doc.id,
          code: data.code || "",
          orderType: orderType,
          productName: orderType === 'product' ? (data.productSnapshot?.name || "未知產品") : undefined,
          seriesName: orderType === 'product' ? (data.productSnapshot?.seriesName || "未指定") : undefined,
          workItem: orderType === 'general' ? (data.workItem || "未命名工作") : undefined,
          targetQuantity: data.targetQuantity || 0,
          status: data.status || "預報",
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || "未知日期"
        }
      }) as WorkOrderColumn[]
      
      setWorkOrders(prev => [...prev, ...workOrdersList])
      
      // 更新分頁狀態
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]
      setLastDoc(lastVisible || null)
      setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE)
      
    } catch (err) {
      error("載入更多工單失敗", err as Error)
      toast.error("載入更多工單失敗")
    } finally {
      setLoadingMore(false)
    }
  }, [lastDoc, hasMore, loadingMore])

  useEffect(() => {
    loadInitialWorkOrders()
  }, [loadInitialWorkOrders])

  // 載入更多資料
  const loadMore = () => {
    loadMoreWorkOrders()
  }

  const handleCreateWorkOrder = () => {
    router.push("/dashboard/work-orders/create")
  }

  // 計算統計數據
  const stats: StandardStats[] = useMemo(() => {
    const total = workOrders.length
    const forecast = workOrders.filter(w => w.status === '預報').length
    const inProgress = workOrders.filter(w => w.status === '進行').length
    const completed = workOrders.filter(w => w.status === '完工').length
    const warehoused = workOrders.filter(w => w.status === '入庫').length

    return [
      {
        title: '預報中',
        value: forecast,
        subtitle: '待開始工單',
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'orange'
      },
      {
        title: '進行中',
        value: inProgress,
        subtitle: '生產中工單',
        icon: <Clock className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '已完工',
        value: completed,
        subtitle: '已完成工單',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '已入庫',
        value: warehoused,
        subtitle: '入庫完成',
        icon: <Package className="h-4 w-4" />,
        color: 'purple'
      }
    ];
  }, [workOrders])

  // 配置欄位
  const columns: StandardColumn<WorkOrderColumn>[] = [
    {
      key: 'code',
      title: '工單資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => {
        // 根據工單類型使用不同的顏色
        const gradientClass = record.orderType === 'general'
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'  // 通用工單：藍紫色
          : 'bg-gradient-to-br from-orange-500 to-red-600';   // 產品工單：橙紅色

        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${gradientClass} rounded-lg flex items-center justify-center`}>
              <Factory className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{record.code}</div>
              <div className="text-sm text-gray-500">工單編號</div>
            </div>
          </div>
        );
      },
      mobileRender: (value, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.code}</div>
          <div className="text-xs text-gray-500">工單編號</div>
        </div>
      )
    },
    {
      key: 'productName',
      title: '產品/項目',
      sortable: true,
      searchable: true,
      priority: 4,
      render: (value, record) => {
        if (record.orderType === 'general') {
          return (
            <div>
              <div className="font-medium text-blue-900">{record.workItem}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs px-1.5 py-0.5">
                  通用工單
                </Badge>
              </div>
            </div>
          )
        }
        return (
          <div>
            <div className="font-medium text-gray-900">{record.productName}</div>
            <div className="text-sm text-gray-500">{record.seriesName}</div>
          </div>
        )
      }
    },
    {
      key: 'targetQuantity',
      title: '目標數量',
      sortable: true,
      priority: 3,
      align: 'center',
      render: (value, record) => {
        // 通用工單顯示 "-"
        if (record.orderType === 'general') {
          return (
            <div className="font-medium text-gray-500">
              -
            </div>
          );
        }
        // 產品工單顯示數量
        return (
          <div className="font-medium text-gray-900">
            {value.toLocaleString()}
          </div>
        );
      },
      hideOnMobile: true
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
      key: 'createdAt',
      title: '建立日期',
      sortable: true,
      priority: 2,
      hideOnMobile: true,
      render: (value) => (
        <div className="text-sm text-gray-600">{value}</div>
      )
    }
  ];

  // 配置操作
  const actions: StandardAction<WorkOrderColumn>[] = [
    {
      key: 'view',
      title: '查看詳情',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => router.push(`/dashboard/work-orders/${record.id}`)
    }
  ];

  // 配置快速篩選
  const quickFilters: QuickFilter[] = [
    {
      key: 'status',
      label: '預報',
      value: '預報',
      color: 'orange',
      count: workOrders.filter(w => w.status === '預報').length
    },
    {
      key: 'status',
      label: '進行',
      value: '進行',
      color: 'green',
      count: workOrders.filter(w => w.status === '進行').length
    },
    {
      key: 'status',
      label: '完工',
      value: '完工',
      color: 'green',
      count: workOrders.filter(w => w.status === '完工').length
    },
    {
      key: 'status',
      label: '入庫',
      value: '入庫',
      color: 'purple',
      count: workOrders.filter(w => w.status === '入庫').length
    }
  ];

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewWorkOrders && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看工單管理頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateGeneralWorkOrder = () => {
    router.push("/dashboard/work-orders/create-general")
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            生產工單
          </h1>
          <p className="text-gray-600 mt-2">管理所有生產工單，追蹤生產進度和狀態</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredWorkOrders}
        loading={loading}
        columns={columns}
        actions={actions}
        onRowClick={(record) => router.push(`/dashboard/work-orders/${record.id}`)}

        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋工單編號、產品名稱、系列..."
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

        // 視圖模式：強制使用表格模式，移除視圖切換按鈕
        viewModes={[{ key: 'table', title: '表格', icon: <List className="h-4 w-4" /> }]}
        defaultViewMode="table"

        // 新增功能
        showAddButton={canManageWorkOrders}
        addButtonText="建立新工單"
        onAdd={handleCreateWorkOrder}

        // 自訂工具列按鈕
        renderToolbarExtra={() => (
          canManageWorkOrders ? (
            <Button
              onClick={handleCreateGeneralWorkOrder}
              variant="outline"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Factory className="mr-2 h-4 w-4" />
              建立通用工單
            </Button>
          ) : null
        )}

        className="space-y-6"
      />

      {/* 分頁載入區域 */}
      <div className="space-y-4">
        {/* 載入更多按鈕 */}
        {hasMore && (
          <div className="flex justify-center">
            <Button 
              onClick={loadMore} 
              disabled={loadingMore}
              variant="outline"
              className="px-8 py-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 text-blue-700 transition-all duration-200"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  載入中...
                </>
              ) : (
                '載入更多工單'
              )}
            </Button>
          </div>
        )}
        
        {/* 已載入所有資料的提示 */}
        {!hasMore && workOrders.length > ITEMS_PER_PAGE && (
          <div className="text-center text-gray-500 py-4">
            已載入所有 {workOrders.length} 筆工單
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkOrdersPage() {
  return (
    <WorkOrdersPageContent />
  );
}