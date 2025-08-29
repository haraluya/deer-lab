"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { generateUniqueCategoryId, generateUniqueSubCategoryId } from "@/lib/utils"

import { toast } from "sonner"
import { Plus, Edit, Trash2, Tag, Calendar, MoreHorizontal, Eye, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MaterialCategoryDialog } from '../materials/MaterialCategoryDialog'

const categorySchema = z.object({
  name: z.string().min(1, "分類名稱不能為空"),
  type: z.enum(["category", "subCategory"]),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface Category {
  id: string
  name: string
  type: "category" | "subCategory"
  usageCount: number
  generatedId?: string // 分類的ID
}

function MaterialCategoriesPageContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      // 從物料資料中提取分類和細分分類
      const materialsSnapshot = await getDocs(collection(db, "materials"))
      const categoryMap = new Map<string, { count: number, id?: string }>()
      const subCategoryMap = new Map<string, { count: number, id?: string }>()
      
      materialsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.category) {
          const existing = categoryMap.get(data.category) || { count: 0, id: data.mainCategoryId };
          existing.count += 1;
          if (data.mainCategoryId) existing.id = data.mainCategoryId;
          categoryMap.set(data.category, existing);
        }
        if (data.subCategory) {
          const existing = subCategoryMap.get(data.subCategory) || { count: 0, id: data.subCategoryId };
          existing.count += 1;
          if (data.subCategoryId) existing.id = data.subCategoryId;
          subCategoryMap.set(data.subCategory, existing);
        }
      })

      // 從 Firestore 讀取主分類
      try {
        const categoriesSnapshot = await getDocs(collection(db, "materialCategories"))
        categoriesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const usageCount = categoryMap.get(data.name)?.count || 0
          categories.push({
            id: doc.id,
            name: data.name,
            type: "category",
            usageCount,
            generatedId: data.id || generateCategoryId(),
          })
        })
      } catch (error) {
        console.log("主分類集合不存在，跳過")
      }
      
      // 從 Firestore 讀取細分分類
      try {
        const subCategoriesSnapshot = await getDocs(collection(db, "materialSubCategories"))
        subCategoriesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const usageCount = subCategoryMap.get(data.name)?.count || 0
          categories.push({
            id: doc.id,
            name: data.name,
            type: "subCategory",
            usageCount,
            generatedId: data.id || generateSubCategoryId(),
          })
        })
      } catch (error) {
        console.log("細分分類集合不存在，跳過")
      }

      // 分開排序：先主分類再細分分類，各自按名稱排序
      const mainCategories = categories.filter(cat => cat.type === 'category').sort((a, b) => a.name.localeCompare(b.name));
      const subCategories = categories.filter(cat => cat.type === 'subCategory').sort((a, b) => a.name.localeCompare(b.name));
      setCategories([...mainCategories, ...subCategories]);
    } catch (error) {
      console.error("載入分類失敗:", error)
      toast.error("載入分類失敗")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // 生成隨機 2 位大寫英文字母 ID
  function generateCategoryId(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 2; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  }

  // 生成隨機 3 位數字 ID
  function generateSubCategoryId(): string {
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            物料分類管理
          </h1>
          <p className="text-gray-600 mt-2">管理物料分類與細分分類</p>
        </div>
        <Button 
          onClick={() => setIsCategoryDialogOpen(true)}
          className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          管理分類
        </Button>
      </div>

      {/* 載入中狀態 */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分類卡片網格 */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length > 0 ? (
            categories.map((category) => (
              <div 
                key={category.id}
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      category.type === 'category' 
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                        : 'bg-gradient-to-br from-green-500 to-emerald-600'
                    }`}>
                      {category.type === 'category' ? (
                        <Tag className="h-5 w-5 text-white" />
                      ) : (
                        <Package className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-500">
                        {category.type === 'category' ? '主分類' : '細分分類'}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${
                    category.type === 'category' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                      : 'bg-green-100 text-green-800 border-green-200'
                  }`}>
                    {category.generatedId || '待生成'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">使用數量</span>
                    <span className="font-medium text-gray-900">{category.usageCount} 個物料</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">分類類型</span>
                    <span className={`font-medium ${
                      category.type === 'category' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {category.type === 'category' ? '主分類' : '細分分類'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">點擊查看詳情</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Tag className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">沒有分類資料</h3>
              <p className="text-gray-500 mb-4">開始建立第一個分類來管理物料</p>
              <Button 
                onClick={() => setIsCategoryDialogOpen(true)}
                variant="outline"
                className="border-teal-200 text-teal-600 hover:bg-teal-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增分類
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 物料分類對話框 */}
      <MaterialCategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      />
    </div>
  )
}

export default function MaterialCategoriesPage() {
  return (
    <MaterialCategoriesPageContent />
  );
}
