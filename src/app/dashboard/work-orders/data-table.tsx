// src/app/dashboard/work-orders/data-table.tsx
"use client"

import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClipboardList, Search, ChevronLeft, ChevronRight, Eye, MoreHorizontal } from "lucide-react"

interface DataTableProps<TData extends { id: string }, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData extends { id: string }, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="space-y-6">
      {/* 搜尋欄 - 現代化設計 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            placeholder="搜尋工單號碼、產品名稱..."
            value={(table.getColumn("productName")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("productName")?.setFilterValue(event.target.value)
            }
            className="pl-10 h-11 bg-white/80 backdrop-blur-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <ClipboardList className="h-4 w-4" />
          <span>找到 {table.getFilteredRowModel().rows.length} 個工單</span>
        </div>
      </div>

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">工單清單</h3>
                  <p className="text-sm text-slate-600">詳細的工單資訊與狀態</p>
                </div>
              </div>
              <div className="text-sm text-slate-600 bg-white/60 px-3 py-1 rounded-full">
                共 {table.getFilteredRowModel().rows.length} 個工單
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table className="table-modern">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-gradient-to-r from-slate-100 to-blue-50 hover:bg-slate-100/80">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="font-semibold text-slate-700 py-4 px-6">
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
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={() => router.push(`/dashboard/work-orders/${row.original.id}`)}
                      className="cursor-pointer hover:bg-blue-50/50 transition-all duration-200 border-b border-slate-100 group"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4 px-6">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-blue-100 rounded-full flex items-center justify-center">
                          <ClipboardList className="h-10 w-10 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-800 mb-2">沒有工單資料</h3>
                          <p className="text-slate-600 mb-4">開始建立第一個工單來管理生產流程</p>
                          <Button 
                            onClick={() => router.push('/dashboard/work-orders/create')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          >
                            建立新工單
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 手機版卡片佈局 */}
      <div className="lg:hidden">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-3 w-3 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">工單清單</h3>
                  <p className="text-xs text-slate-600">手機版檢視</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 bg-white/60 px-2 py-1 rounded-full">
                {table.getFilteredRowModel().rows.length} 個
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {table.getRowModel().rows?.length ? (
              <div className="space-y-3">
                {table.getRowModel().rows.map((row) => {
                  const workOrder = row.original as any
                  return (
                    <div
                      key={row.id}
                      onClick={() => router.push(`/dashboard/work-orders/${workOrder.id}`)}
                      className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-blue-50/50 transition-all duration-200 shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <ClipboardList className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{workOrder.code}</div>
                            <div className="text-xs text-slate-500">建立於 {workOrder.createdAt}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/work-orders/${workOrder.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">產品</div>
                          <div className="font-medium text-slate-800 truncate">
                            {workOrder.productName}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">目標數量</div>
                          <div className="font-semibold text-blue-600">
                            {workOrder.targetQuantity} g
                          </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">狀態</div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              workOrder.status === '預報' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                              workOrder.status === '進行' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              workOrder.status === '完工' ? 'bg-green-100 text-green-800 border border-green-200' :
                              workOrder.status === '入庫' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {workOrder.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">沒有工單資料</h3>
                <p className="text-sm text-slate-600 text-center mb-4">開始建立第一個工單來管理生產流程</p>
                <Button 
                  onClick={() => router.push('/dashboard/work-orders/create')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  建立新工單
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 分頁控制 - 現代化設計 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
        <div className="text-sm text-slate-600 bg-white/60 px-4 py-2 rounded-lg">
          顯示第 {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} 到{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          筆，共 {table.getFilteredRowModel().rows.length} 筆資料
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一頁
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            下一頁
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}