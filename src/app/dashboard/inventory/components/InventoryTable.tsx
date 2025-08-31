"use client"

import { useState } from "react"
import { AlertTriangle, TrendingUp, TrendingDown, Package, FlaskConical } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
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
            
            return (
              <TableRow 
                key={item.id}
                className="hover:bg-gray-50 transition-colors"
              >
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
  )
}