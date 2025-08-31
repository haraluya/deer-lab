"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Package, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InventoryRecord, getChangeReasonLabel } from "@/lib/inventoryRecords"

export type InventoryRecordColumn = InventoryRecord

// 定義點擊處理函數的類型
export type InventoryRecordClickHandler = (record: InventoryRecord) => void

// 修改 columns 函數，接受點擊處理函數作為參數
export const createColumns = (onRecordClick: InventoryRecordClickHandler): ColumnDef<InventoryRecordColumn>[] => [
  {
    accessorKey: "changeDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
      >
        動作時間
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("changeDate") as Date
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
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "changeReason",
    header: () => <div className="font-semibold text-gray-700">動作類型</div>,
    cell: ({ row }) => {
      const reason = row.getValue("changeReason") as string
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
        <Badge variant={getBadgeVariant(reason)} className="text-xs">
          {getChangeReasonLabel(reason)}
        </Badge>
      )
    },
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: "equals",
  },
  {
    accessorKey: "details",
    header: () => <div className="font-semibold text-gray-700">影響項目</div>,
    cell: ({ row }) => {
      const details = row.getValue("details") as any[]
      const materialCount = details.filter(d => d.itemType === 'material').length
      const fragranceCount = details.filter(d => d.itemType === 'fragrance').length
      
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">{materialCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-purple-500" />
            <span className="text-xs text-purple-600 font-medium">{fragranceCount}</span>
          </div>
          <div className="text-xs text-gray-500">
            共 {details.length} 項
          </div>
        </div>
      )
    },
    enableColumnFilter: false,
    enableSorting: true,
  },
  {
    accessorKey: "operatorName",
    header: () => <div className="font-semibold text-gray-700">操作人員</div>,
    cell: ({ row }) => (
      <div className="text-gray-700 font-medium">
        {row.getValue("operatorName")}
      </div>
    ),
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: "includesString",
  },
  {
    accessorKey: "remarks",
    header: () => <div className="font-semibold text-gray-700">備註</div>,
    cell: ({ row }) => {
      const remarks = row.getValue("remarks") as string
      if (!remarks) {
        return <div className="text-gray-400 text-sm">-</div>
      }
      return (
        <div className="text-gray-600 text-sm max-w-xs truncate" title={remarks}>
          {remarks}
        </div>
      )
    },
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: "includesString",
  },
  {
    accessorKey: "relatedDocumentId",
    header: () => <div className="font-semibold text-gray-700">相關文件</div>,
    cell: ({ row }) => {
      const documentId = row.getValue("relatedDocumentId") as string
      const documentType = row.getValue("relatedDocumentType") as string
      
      if (!documentId) {
        return <div className="text-gray-400 text-sm">-</div>
      }
      
      return (
        <div className="text-gray-600 text-sm max-w-xs truncate" title={`${documentType || '文件'}: ${documentId}`}>
          {documentType || '文件'}: {documentId}
        </div>
      )
    },
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: "includesString",
  },
]

// 為了向後兼容，保留原有的 columns 導出
export const columns = createColumns(() => {
  console.warn('columns 未提供點擊處理函數，請使用 createColumns 函數並傳入處理函數')
})
