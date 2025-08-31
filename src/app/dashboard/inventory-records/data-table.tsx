"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from "lucide-react"
import { getChangeReasonLabel, getItemTypeLabel } from "@/lib/inventoryRecords"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="w-full">
      {/* 搜尋和篩選區域 */}
      <div className="flex items-center py-4 gap-4">
        <div className="flex-1">
          <Input
            placeholder="搜尋物料編號、名稱、備註..."
            value={(table.getColumn("itemCode")?.getFilterValue() as string) || ""}
            onChange={(event) => {
              const value = event.target.value;
              table.getColumn("itemCode")?.setFilterValue(value);
            }}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            共 {data.length} 筆紀錄
          </Badge>
        </div>
      </div>

      {/* 桌面版表格 */}
      <div className="hidden lg:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="bg-gradient-to-r from-gray-50 to-gray-100">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="text-gray-400 text-lg">📊</div>
                      <div className="text-gray-500 font-medium">沒有找到庫存紀錄</div>
                      <div className="text-gray-400 text-sm">請嘗試調整搜尋條件</div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 手機版卡片佈局 */}
      <div className="lg:hidden space-y-4">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getItemTypeLabel(row.getValue("itemType") as string)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getChangeReasonLabel(row.getValue("changeReason") as string)}
                    </Badge>
                  </div>
                  <div className="font-medium text-gray-900">
                    {row.getValue("itemName")}
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    {row.getValue("itemCode")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-700">
                    {row.getValue("quantityChange")}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  操作: {row.getValue("operatorName")}
                </div>
                <div className="text-gray-600">
                  {new Intl.DateTimeFormat('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(row.getValue("changeDate") as Date)}
                </div>
              </div>

              {(row.getValue("remarks") as string) && (
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                  備註: {row.getValue("remarks") as string}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                  onClick={() => {
                    // 這裡需要處理點擊事件，但由於這是通用組件，我們暫時不處理
                    console.log('查看詳情:', row.getValue("itemCode"))
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <div className="text-gray-500 font-medium text-lg mb-2">沒有找到庫存紀錄</div>
            <div className="text-gray-400">請嘗試調整搜尋條件</div>
          </div>
        )}
      </div>

             {/* 分頁控制 */}
       <div className="flex items-center justify-between space-x-2 py-4">
         <div className="flex-1 text-sm text-muted-foreground">
           顯示第 {table.getState()?.pagination?.pageIndex * table.getState()?.pagination?.pageSize + 1} 到{" "}
           {Math.min(
             (table.getState()?.pagination?.pageIndex + 1) * table.getState()?.pagination?.pageSize,
             table.getFilteredRowModel().rows.length
           )}{" "}
           筆，共 {table.getFilteredRowModel().rows.length} 筆紀錄
         </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
