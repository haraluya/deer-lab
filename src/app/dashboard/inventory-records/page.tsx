"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import { usePermission } from '@/hooks/usePermission'
import { useDataSearch } from '@/hooks/useDataSearch'
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage'
import { StandardStats } from '@/components/StandardStatsCard'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Minus,
  TrendingUp,
  Calendar,
  User,
  Package,
  FlaskConical,
  Eye,
  Shield
} from "lucide-react"
import {
  getInventoryRecords,
  InventoryRecord,
  InventoryRecordQueryParams,
  getChangeReasonLabel,
  getItemTypeLabel
} from "@/lib/inventoryRecords"
import { BUSINESS_CONFIG } from '@/config/business'
import { InventoryRecordDialog } from "@/components/InventoryRecordDialog"
import { Alert, AlertDescription } from '@/components/ui/alert'

// 將 InventoryRecord 擴展為適合表格顯示的格式
interface InventoryRecordWithExtras extends InventoryRecord {
  materialCount: number;
  fragranceCount: number;
  changeReasonLabel: string;
}

function InventoryRecordsPageContent() {
  const { appUser } = useAuth()
  const [records, setRecords] = useState<InventoryRecordWithExtras[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // 對話框狀態
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewInventoryRecords = hasPermission('inventoryRecords.view') || hasPermission('inventoryRecords:view');

  // 搜尋配置
  const searchConfig = {
    searchFields: [
      { key: 'remarks' as keyof InventoryRecordWithExtras },
      { key: 'operatorName' as keyof InventoryRecordWithExtras }
    ],
    filterConfigs: [
      {
        key: 'changeReason' as keyof InventoryRecordWithExtras,
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
    filteredData: filteredRecords,
    totalCount,
    filteredCount
  } = useDataSearch(records, searchConfig);

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getInventoryRecords({
        pageSize: BUSINESS_CONFIG.inventory.pagination.defaultPageSize
      })

      // 擴展記錄資料以便於表格顯示
      const extendedRecords: InventoryRecordWithExtras[] = result.records.map(record => ({
        ...record,
        materialCount: record.details.filter(d => d.itemType === 'material').length,
        fragranceCount: record.details.filter(d => d.itemType === 'fragrance').length,
        changeReasonLabel: getChangeReasonLabel(record.changeReason)
      }))

      setRecords(extendedRecords)
    } catch (error) {
      console.error('載入庫存紀錄失敗:', error)
      toast.error('載入庫存紀錄失敗')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canViewInventoryRecords) {
      loadRecords()
    }
  }, [canViewInventoryRecords, loadRecords])

  // 定義表格欄位
  const columns: StandardColumn<InventoryRecordWithExtras>[] = [
    {
      key: 'changeDate',
      title: '動作時間',
      sortable: true,
      priority: 5,
      render: (value, record) => {
        const date = record.changeDate
        return (
          <div className="text-sm text-gray-700">
            <div className="font-medium">
              {new Intl.DateTimeFormat('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }).format(date)}
            </div>
            <div className="text-xs text-gray-500">
              {new Intl.DateTimeFormat('zh-TW', {
                hour: '2-digit',
                minute: '2-digit'
              }).format(date)}
            </div>
          </div>
        )
      },
      mobileRender: (value, record) => (
        <div className="text-sm">
          <div className="font-medium">
            {new Intl.DateTimeFormat('zh-TW', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }).format(record.changeDate)}
          </div>
        </div>
      )
    },
    {
      key: 'changeReason',
      title: '動作類型',
      sortable: true,
      filterable: true,
      priority: 4,
      render: (value, record) => {
        const getBadgeVariant = (reason: string) => {
          switch (reason) {
            case 'purchase': return 'default'
            case 'workorder': return 'secondary'
            case 'inventory_check': return 'outline'
            case 'manual_adjustment': return 'destructive'
            default: return 'secondary'
          }
        }

        return (
          <Badge variant={getBadgeVariant(record.changeReason)} className="text-xs">
            {record.changeReasonLabel}
          </Badge>
        )
      }
    },
    {
      key: 'details',
      title: '影響項目',
      sortable: true,
      priority: 3,
      render: (value, record) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">{record.materialCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <FlaskConical className="h-3 w-3 text-purple-500" />
            <span className="text-xs text-purple-600 font-medium">{record.fragranceCount}</span>
          </div>
          <div className="text-xs text-gray-500">
            共 {record.details.length} 項
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div className="text-xs text-gray-500">
          共 {record.details.length} 項
        </div>
      )
    },
    {
      key: 'operatorName',
      title: '操作人員',
      sortable: true,
      searchable: true,
      priority: 3,
      render: (value) => (
        <div className="text-gray-700 font-medium">
          {value}
        </div>
      )
    },
    {
      key: 'remarks',
      title: '備註',
      sortable: true,
      searchable: true,
      priority: 2,
      hideOnMobile: true,
      render: (value) => {
        if (!value) {
          return <div className="text-gray-400 text-sm">-</div>
        }
        return (
          <div className="text-gray-600 text-sm max-w-xs truncate" title={value}>
            {value}
          </div>
        )
      }
    }
  ];

  // 定義操作
  const actions: StandardAction<InventoryRecordWithExtras>[] = [
    {
      key: 'view',
      title: '查看詳情',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => {
        setSelectedRecord(record)
        setIsDialogOpen(true)
      }
    }
  ];

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => {
    const purchase = records.filter(r => r.changeReason === 'purchase').length
    const workorder = records.filter(r => r.changeReason === 'workorder').length
    const inventoryCheck = records.filter(r => r.changeReason === 'inventory_check').length
    const manualAdjustment = records.filter(r => r.changeReason === 'manual_adjustment').length

    return [
      {
        title: '採購購入',
        value: purchase,
        subtitle: '採購入庫紀錄',
        icon: <Plus className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '工單領料',
        value: workorder,
        subtitle: '工單出庫紀錄',
        icon: <Minus className="h-4 w-4" />,
        color: 'orange'
      },
      {
        title: '庫存盤點',
        value: inventoryCheck,
        subtitle: '盤點調整紀錄',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '直接修改',
        value: manualAdjustment,
        subtitle: '手動調整紀錄',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'red'
      }
    ];
  }, [records]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => {
    const changeReasons = new Map<string, number>();

    records.forEach(record => {
      const reason = record.changeReason;
      changeReasons.set(reason, (changeReasons.get(reason) || 0) + 1);
    });

    const reasonColors: Record<string, 'blue' | 'green' | 'orange' | 'red'> = {
      'purchase': 'green',
      'workorder': 'orange',
      'inventory_check': 'blue',
      'manual_adjustment': 'red'
    };

    return Array.from(changeReasons.entries()).map(([reason, count]) => ({
      key: 'changeReason',
      label: getChangeReasonLabel(reason),
      value: reason,
      count: count,
      color: reasonColors[reason] || 'blue'
    }));
  }, [records]);

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewInventoryRecords && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看庫存歷史頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-indigo-600 bg-clip-text text-transparent">
            庫存歷史
          </h1>
          <p className="text-gray-600 mt-2">完整的庫存變動追蹤與審計系統</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredRecords}
        loading={isLoading}
        columns={columns}
        actions={actions}
        onRowClick={(record) => {
          setSelectedRecord(record)
          setIsDialogOpen(true)
        }}

        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋備註、操作人員..."
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

        // 選擇功能
        selectable={false}

        // 統計資訊
        stats={stats}
        showStats={true}

        // 工具列功能
        showToolbar={true}
        toolbarActions={
          <Button
            variant="outline"
            onClick={loadRecords}
            className="hover:bg-gray-50 transition-all duration-200"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            重新整理
          </Button>
        }

        // 權限控制
        permissions={{
          view: canViewInventoryRecords,
          create: false,
          edit: false,
          delete: false,
          export: false,
          import: false
        }}

        className="space-y-6"
      />

      {/* 庫存紀錄詳情對話框 */}
      <InventoryRecordDialog
        record={selectedRecord}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedRecord(null)
        }}
      />
    </div>
  )
}

export default function InventoryRecordsPage() {
  return (
    <InventoryRecordsPageContent />
  )
}