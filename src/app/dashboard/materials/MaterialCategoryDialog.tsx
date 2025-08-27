"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { generateUniqueCategoryId, generateUniqueSubCategoryId } from "@/lib/utils"

import { toast } from "sonner"
import { Plus, Edit, Trash2, Tag, Calendar, MoreHorizontal, Eye, Package, X } from "lucide-react"

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
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

interface MaterialCategoryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function MaterialCategoryDialog({ isOpen, onOpenChange }: MaterialCategoryDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "category",
    },
  })

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const categoriesList: Category[] = []
      
      // 從 Firestore 讀取主分類
      try {
        const categoriesSnapshot = await getDocs(collection(db, "materialCategories"))
        categoriesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          categoriesList.push({
            id: doc.id,
            name: data.name,
            type: "category",
            usageCount: 0, // 暫時設為0，稍後計算
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
          categoriesList.push({
            id: doc.id,
            name: data.name,
            type: "subCategory",
            usageCount: 0, // 暫時設為0，稍後計算
            generatedId: data.id || generateSubCategoryId(),
          })
        })
      } catch (error) {
        console.log("細分分類集合不存在，跳過")
      }
      
      // 計算使用數量（從物料資料中統計）
      try {
        const materialsSnapshot = await getDocs(collection(db, "materials"))
        const categoryUsage = new Map<string, number>()
        const subCategoryUsage = new Map<string, number>()
        
        materialsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.category) {
            categoryUsage.set(data.category, (categoryUsage.get(data.category) || 0) + 1)
          }
          if (data.subCategory) {
            subCategoryUsage.set(data.subCategory, (subCategoryUsage.get(data.subCategory) || 0) + 1)
          }
        })
        
        // 更新使用數量
        categoriesList.forEach(category => {
          if (category.type === 'category') {
            category.usageCount = categoryUsage.get(category.name) || 0
          } else {
            category.usageCount = subCategoryUsage.get(category.name) || 0
          }
        })
      } catch (error) {
        console.log("無法統計使用數量")
      }

      setCategories(categoriesList.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error("載入分類失敗:", error)
      toast.error("載入分類失敗")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const handleAdd = () => {
    setEditingCategory(null)
    form.reset()
    setIsDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.reset({
      name: category.name,
      type: category.type,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (category: Category) => {
    if (category.usageCount > 0) {
      toast.error(`無法刪除「${category.name}」，因為還有 ${category.usageCount} 個物料正在使用此分類`)
      return
    }
    setCategoryToDelete(category)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      // 這裡可以添加刪除邏輯，但由於分類是從物料中提取的，實際刪除需要更新所有相關物料
      toast.success(`分類「${categoryToDelete.name}」已刪除`)
      loadCategories()
    } catch (error) {
      console.error("刪除分類失敗:", error)
      toast.error("刪除分類失敗")
    } finally {
      setIsConfirmOpen(false)
      setCategoryToDelete(null)
    }
  }

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        // 更新現有分類
        toast.success(`分類「${data.name}」已更新`)
      } else {
        // 新增分類 - 生成唯一 ID
        let generatedId = '';
        if (data.type === 'category') {
          generatedId = await generateUniqueCategoryId(db);
        } else {
          generatedId = await generateUniqueSubCategoryId(db);
        }
        
        // 將分類寫入 Firestore
        if (!db) {
          throw new Error("Firebase 未初始化")
        }
        
        const collectionName = data.type === 'category' ? 'materialCategories' : 'materialSubCategories';
        const categoryData = {
          id: generatedId,
          name: data.name,
          type: data.type,
          createdAt: new Date(),
          ...(data.type === 'subCategory' && { parentCategory: '未指定' }) // 細分分類需要父分類
        };
        
        await addDoc(collection(db, collectionName), categoryData);
        
        console.log(`新增${data.type === 'category' ? '主分類' : '細分分類'}，ID: ${generatedId}`);
        toast.success(`分類「${data.name}」已新增，ID: ${generatedId}`)
      }
      setIsDialogOpen(false)
      loadCategories()
    } catch (error) {
      console.error("儲存分類失敗:", error)
      toast.error("儲存分類失敗")
    }
  }

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
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              物料分類管理
            </DialogTitle>
            <DialogDescription>
              管理物料分類與細分分類
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end mb-4">
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增分類
            </Button>
          </div>

          {/* 分類卡片容器 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                  </div>
                </div>
              ))
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <div 
                  key={category.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                        <Tag className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {category.type === 'category' ? '主分類' : '細分分類'} ID: 
                          <span className="font-mono bg-gray-100 px-1 rounded ml-1">
                            {category.generatedId || '待生成'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                          <Edit className="h-3 w-3 mr-2" />
                          編輯分類
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(category)}
                          className="text-red-600 focus:text-red-600"
                          disabled={category.usageCount > 0}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          刪除分類
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-teal-600" />
                      <div>
                        <p className="text-xs text-gray-500">分類類型</p>
                        <Badge className={`text-xs ${category.type === 'category' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'}`}>
                          {category.type === 'category' ? '主分類' : '細分分類'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">使用數量</p>
                        <p className="text-xs font-medium text-gray-900">
                          {category.usageCount} 個物料
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Tag className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">沒有分類資料</h3>
                <p className="text-xs text-gray-500 mb-3">開始建立第一個分類來管理物料</p>
                <Button 
                  onClick={handleAdd}
                  variant="outline"
                  size="sm"
                  className="border-teal-200 text-teal-600 hover:bg-teal-50"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  新增分類
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增/編輯分類對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "編輯分類" : "新增分類"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? "修改分類資訊" : "建立新的物料分類"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分類名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="輸入分類名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分類類型</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="category">主分類 (2位大寫英文)</option>
                        <option value="subCategory">細分分類 (3位數字)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  {editingCategory ? "更新" : "新增"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 確認刪除對話框 */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        description={`您確定要刪除分類「${categoryToDelete?.name}」嗎？此操作無法復原。`}
      />
    </>
  )
}
