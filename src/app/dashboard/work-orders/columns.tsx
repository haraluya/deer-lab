// src/app/dashboard/work-orders/columns.tsx
"use client"

import { ColumnDef, CellContext, HeaderContext } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

// 現代化狀態Badge組件
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "預報":
        return {
          className: "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200 shadow-sm",
          icon: "⏳"
        }
      case "進行":
        return {
          className: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200 shadow-sm",
          icon: "🔄"
        }
      case "完工":
        return {
          className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-sm",
          icon: "✅"
        }
      case "入庫":
        return {
          className: "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200 shadow-sm",
          icon: "📦"
        }
      default:
        return {
          className: "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200 shadow-sm",
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

export type WorkOrderColumn = {
  id: string
  code: string
  productName: string
  targetQuantity: number
  status: string
  createdAt: string
}

const ActionsCell = ({ row }: CellContext<WorkOrderColumn, unknown>) => {
  const router = useRouter();
  const workOrder = row.original;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/work-orders/${workOrder.id}`);
        }}
        title="查看詳情"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-slate-50 hover:text-slate-600 transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/work-orders/${workOrder.id}`);
        }}
        title="更多操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const columns: ColumnDef<WorkOrderColumn>[] = [
  {
    accessorKey: "code",
    header: ({ column }: HeaderContext<WorkOrderColumn, unknown>) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
      >
        工單號碼
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => (
      <div className="font-mono font-semibold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
        {row.getValue("code")}
      </div>
    ),
  },
  {
    accessorKey: "productName",
    header: () => (
      <div className="font-semibold text-slate-700">產品名稱</div>
    ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => (
      <div className="font-medium text-slate-800 max-w-xs truncate" title={row.getValue("productName")}>
        {row.getValue("productName")}
      </div>
    ),
  },
  {
    accessorKey: "targetQuantity",
    header: () => (
      <div className="text-right font-semibold text-slate-700">目標產量</div>
    ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => {
      const amount = parseFloat(row.getValue("targetQuantity"))
      return (
        <div className="text-right">
          <div className="font-bold text-blue-600 text-lg">{amount}</div>
          <div className="text-xs text-slate-500 font-medium">克 (g)</div>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: () => (
      <div className="font-semibold text-slate-700">狀態</div>
    ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => (
      <StatusBadge status={row.getValue("status")} />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }: HeaderContext<WorkOrderColumn, unknown>) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
      >
        建立日期
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => (
      <div className="text-slate-600 font-medium">
        {row.getValue("createdAt")}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => (
      <div className="text-right font-semibold text-slate-700">操作</div>
    ),
    cell: ActionsCell,
  },
]
