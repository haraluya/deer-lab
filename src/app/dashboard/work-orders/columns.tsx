// src/app/dashboard/work-orders/columns.tsx
"use client"

import { ColumnDef, CellContext, HeaderContext } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "已完工":
    case "已入庫":
      return "default"
    case "進行中":
      return "secondary"
    case "待完工確認":
    case "待品檢":
      return "outline"
    case "已取消":
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
      <Badge variant={getStatusVariant(row.getValue("status"))}>
        {row.getValue("status")}
      </Badge>
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
