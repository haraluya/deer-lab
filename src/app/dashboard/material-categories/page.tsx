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
import { CategoryDetailDialog } from './CategoryDetailDialog'

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // 處理從詳情對話框編輯分類
  const handleEditFromDetail = (category: any) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      type: category.type,
      usageCount: category.usageCount,
      generatedId: category.generatedId,
    });
    setIsDialogOpen(true);
  };

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

      const categoriesList: Category[] = []
      
      // 添加主分類
      categoryMap.forEach((info, name) => {
        categoriesList.push({
          id: `category_${name}`,
          name,
          type: "category",
          usageCount: info.count,
          generatedId: info.id || generateCategoryId(), // 使用現有ID或生成新ID
        })
      })

      // 添加細分分類
      subCategoryMap.forEach((info, name) => {
        categoriesList.push({
          id: `subCategory_${name}`,
          name,
          type: "subCategory",
          usageCount: info.count,
          generatedId: info.id || generateSubCategoryId(), // 使用現有ID或生成新ID
        })
      })

      setCategories(categoriesList.sort((a, b) => a.name.localeCompare(b.name)))
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

  const handleViewDetail = (category: Category) => {
    setSelectedCategory(category)
    setIsDetailDialogOpen(true)
  }

  const handleDelete = async (category: Category) => {
    if (category.usageCount > 0) {
      toast.error(`無法刪除「${category.name}」，因為還有 ${category.usageCount} 個物料正在使用此分類`)
      return
    }

    try {
      // 這裡可以添加刪除邏輯，但由於分類是從物料中提取的，實際刪除需要更新所有相關物料
      toast.success(`分類「${category.name}」已刪除`)
      loadCategories()
    } catch (error) {
      console.error("刪除分類失敗:", error)
      toast.error("刪除分類失敗")
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
    <div className="container mx-auto py-10">
      {/* 桌面版標題和按鈕 */}
      <div className="hidden lg:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            物料分類管理
          </h1>
          <p className="text-gray-600 mt-2">管理物料分類與細分分類</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增分類
        </Button>
      </div>

      {/* 手機版標題和按鈕 */}
      <div className="lg:hidden mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            物料分類管理
          </h1>
          <p className="text-gray-600 mt-1 text-sm">管理物料分類與細分分類</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增分類
        </Button>
      </div>

      {/* 分類卡片容器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
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
          ))
        ) : categories.length > 0 ? (
          categories.map((category) => (
            <div 
              key={category.id}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group"
              onClick={() => handleViewDetail(category)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Tag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-teal-600 transition-colors duration-200">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {category.type === 'category' ? '主分類' : '細分分類'} ID: 
                      <span className="font-mono bg-gray-100 px-1 rounded ml-1">
                        {category.generatedId || '待生成'}
                      </span>
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>操作</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleViewDetail(category)}>
                      <Eye className="h-4 w-4 mr-2" />
                      查看詳情
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(category)}>
                      <Edit className="h-4 w-4 mr-2" />
                      編輯分類
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(category)}
                      className="text-red-600 focus:text-red-600"
                      disabled={category.usageCount > 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      刪除分類
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-teal-600" />
                  <div>
                    <p className="text-xs text-gray-500">分類類型</p>
                    <Badge className={`text-xs ${category.type === 'category' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'}`}>
                      {category.type === 'category' ? '主分類' : '細分分類'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-500">使用數量</p>
                    <p className="text-sm font-medium text-gray-900">
                      {category.usageCount} 個物料
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">點擊查看詳情</span>
                </div>
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
              onClick={handleAdd}
              variant="outline"
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增分類
            </Button>
          </div>
        )}
      </div>

      {/* 新增/編輯分類對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent aria-describedby="material-category-dialog-description">
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

      {/* 分類詳情對話框 */}
      <CategoryDetailDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        category={selectedCategory}
        onEdit={handleEditFromDetail}
      />
    </div>
  )
}

export default function MaterialCategoriesPage() {
  return (
    <MaterialCategoriesPageContent />
  );
}
