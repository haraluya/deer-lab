// src/app/dashboard/work-orders/columns.tsx
"use client"

import { ColumnDef, CellContext, HeaderContext } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

// 自定義狀態Badge組件
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "預報":
        return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
      case "進行":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
      case "完工":
        return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
      case "入庫":
        return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Badge className={`${getStatusStyle(status)} font-medium`}>
      {status}
    </Badge>
  )
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "完工":
      return "default"
    case "進行":
      return "secondary"
    case "預報":
      return "outline"
    case "入庫":
      return "destructive"
    default:
      return "secondary"
  }
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
    <div className="text-right">
      <Button
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/work-orders/${workOrder.id}`);
        }}
      >
        <span className="sr-only">開啟選單</span>
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
      >
        工單號碼
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => <div className="font-mono pl-4">{row.getValue("code")}</div>,
  },
  {
    accessorKey: "productName",
    header: "產品名稱",
  },
  {
    accessorKey: "targetQuantity",
    header: () => <div className="text-right">目標產量</div>,
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => {
      const amount = parseFloat(row.getValue("targetQuantity"))
      return <div className="text-right font-medium">{amount} g</div>
    },
  },
  {
    accessorKey: "status",
    header: "狀態",
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
        >
          建立日期
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    cell: ({ row }: CellContext<WorkOrderColumn, unknown>) => <div className="pl-4">{row.getValue("createdAt")}</div>,
  },
  {
    id: "actions",
    cell: ActionsCell,
  },
]
