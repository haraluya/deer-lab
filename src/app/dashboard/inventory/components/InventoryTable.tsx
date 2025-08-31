"use client"

import { useState } from "react"
import { AlertTriangle, TrendingUp, TrendingDown, Package, FlaskConical } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { useInventoryStore } from "@/stores/inventoryStore"

interface InventoryItem {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  costPerUnit: number
  category?: string
  series?: string
  type: 'material' | 'fragrance'
}

interface InventoryTableProps {
  items: InventoryItem[]
  loading: boolean
  onQuickUpdate: (item: InventoryItem) => void
  type: 'material' | 'fragrance'
}

export function InventoryTable({ items, loading, onQuickUpdate, type }: InventoryTableProps) {
  const { batchOperations, selectedItems, toggleSelection } = useInventoryStore()
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="mb-4">
          {type === 'material' ? 
            <Package className="h-12 w-12 mx-auto text-gray-300" /> :
            <FlaskConical className="h-12 w-12 mx-auto text-gray-300" />
          }
        </div>
        <p className="text-lg font-medium">沒有找到{type === 'material' ? '物料' : '香精'}項目</p>
        <p className="text-sm">嘗試調整搜尋條件或新增項目</p>
      </div>
    )
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.minStock) {
      return {
        status: "low",
        text: "低庫存",
        badgeColor: "bg-red-100 text-red-800 border-red-200",
        icon: <AlertTriangle className="h-3 w-3" />
      }
    } else if (item.currentStock >= item.maxStock) {
      return {
        status: "high", 
        text: "高庫存",
        badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: <TrendingUp className="h-3 w-3" />
      }
    } else {
      return {
        status: "normal",
        text: "正常",
        badgeColor: "bg-green-100 text-green-800 border-green-200",
        icon: <TrendingDown className="h-3 w-3" />
      }
    }
  }

  return (
    <div>
      {/* 桌面版表格 */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {batchOperations.isEnabled && (
                <TableHead className="font-semibold w-12">
                  <Checkbox
                    checked={items.every(item => selectedItems[type === 'material' ? 'materials' : 'fragrances'].includes(item.id))}
                    onCheckedChange={(checked) => {
                      items.forEach(item => {
                        const isSelected = selectedItems[type === 'material' ? 'materials' : 'fragrances'].includes(item.id)
                        if (checked && !isSelected) {
                          toggleSelection(type === 'material' ? 'materials' : 'fragrances', item.id)
                        } else if (!checked && isSelected) {
                          toggleSelection(type === 'material' ? 'materials' : 'fragrances', item.id)
                        }
                      })
                    }}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">代碼</TableHead>
              <TableHead className="font-semibold">名稱</TableHead>
              <TableHead className="font-semibold">分類</TableHead>
              <TableHead className="font-semibold text-right">當前庫存</TableHead>
              <TableHead className="font-semibold text-right">安全庫存</TableHead>
              <TableHead className="font-semibold text-right">單價</TableHead>
              <TableHead className="font-semibold text-right">庫存價值</TableHead>
              <TableHead className="font-semibold text-center">狀態</TableHead>
              <TableHead className="font-semibold text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const stockStatus = getStockStatus(item)
              const stockValue = item.currentStock * item.costPerUnit
              
              const isSelected = selectedItems[type === 'material' ? 'materials' : 'fragrances'].includes(item.id)
              
              return (
                <TableRow 
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isSelected && batchOperations.isEnabled ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  {batchOperations.isEnabled && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(type === 'material' ? 'materials' : 'fragrances', item.id)}
                      />
                    </TableCell>
                  )}
                  
                  <TableCell className="font-mono text-sm font-medium">
                    {item.code}
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.series && (
                        <div className="text-sm text-gray-500">系列: {item.series}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-gray-600">{item.category || '-'}</span>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className="h-auto p-2 font-semibold hover:bg-blue-50"
                      onClick={() => onQuickUpdate(item)}
                    >
                      <span className="text-blue-600">
                        {item.currentStock} {item.unit}
                      </span>
                    </Button>
                  </TableCell>
                  
                  <TableCell className="text-right text-sm text-gray-600">
                    {item.minStock} {item.unit}
                  </TableCell>
                  
                  <TableCell className="text-right text-sm text-gray-600">
                    NT$ {item.costPerUnit.toLocaleString()}
                  </TableCell>
                  
                  <TableCell className="text-right font-medium text-gray-900">
                    NT$ {stockValue.toLocaleString()}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`${stockStatus.badgeColor} text-xs flex items-center gap-1 w-fit mx-auto`}
                    >
                      {stockStatus.icon}
                      {stockStatus.text}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onQuickUpdate(item)}
                      className="text-xs"
                    >
                      快速調整
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* 手機版卡片 */}
      <div className="md:hidden space-y-4">
        {items.map((item) => {
          const stockStatus = getStockStatus(item)
          const stockValue = item.currentStock * item.costPerUnit
          const isSelected = selectedItems[type === 'material' ? 'materials' : 'fragrances'].includes(item.id)
          
          return (
            <div 
              key={item.id}
              className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                isSelected && batchOperations.isEnabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {/* 卡片標題區 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {batchOperations.isEnabled && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(type === 'material' ? 'materials' : 'fragrances', item.id)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-lg mb-1">{item.name}</div>
                    <div className="font-mono text-sm text-gray-600 mb-1">代碼: {item.code}</div>
                    {item.series && (
                      <div className="text-sm text-gray-500">系列: {item.series}</div>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${stockStatus.badgeColor} text-xs flex items-center gap-1 shrink-0 ml-2`}
                >
                  {stockStatus.icon}
                  {stockStatus.text}
                </Badge>
              </div>

              {/* 分類資訊 */}
              {item.category && (
                <div className="mb-3 py-1 px-2 bg-gray-100 rounded text-sm text-gray-700 inline-block">
                  {item.category}
                </div>
              )}

              {/* 庫存資訊區 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">當前庫存</div>
                  <button
                    onClick={() => onQuickUpdate(item)}
                    className="text-lg font-bold text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    {item.currentStock} {item.unit}
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 font-medium mb-1">安全庫存</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {item.minStock} {item.unit}
                  </div>
                </div>
              </div>

              {/* 價格資訊區 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600 font-medium mb-1">單價</div>
                  <div className="text-lg font-semibold text-green-700">
                    NT$ {item.costPerUnit.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs text-purple-600 font-medium mb-1">庫存價值</div>
                  <div className="text-lg font-bold text-purple-700">
                    NT$ {stockValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex justify-end">
                <Button
                  onClick={() => onQuickUpdate(item)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm hover:shadow transition-all duration-200 min-h-[44px]"
                >
                  快速調整
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}