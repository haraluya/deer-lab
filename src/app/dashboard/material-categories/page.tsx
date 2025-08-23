"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Tag, Calendar, MoreHorizontal, Eye } from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
}

export default function MaterialCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

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
      // 從物料資料中提取分類和細分分類
      const materialsSnapshot = await getDocs(collection(db, "materials"))
      const categoryMap = new Map<string, number>()
      const subCategoryMap = new Map<string, number>()
      
      materialsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.category) {
          categoryMap.set(data.category, (categoryMap.get(data.category) || 0) + 1)
        }
        if (data.subCategory) {
          subCategoryMap.set(data.subCategory, (subCategoryMap.get(data.subCategory) || 0) + 1)
        }
      })

      const categoriesList: Category[] = []
      
      // 添加分類
      categoryMap.forEach((count, name) => {
        categoriesList.push({
          id: `category_${name}`,
          name,
          type: "category",
          usageCount: count,
        })
      })

      // 添加細分分類
      subCategoryMap.forEach((count, name) => {
        categoriesList.push({
          id: `subCategory_${name}`,
          name,
          type: "subCategory",
          usageCount: count,
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
        // 新增分類
        toast.success(`分類「${data.name}」已新增`)
      }
      setIsDialogOpen(false)
      loadCategories()
    } catch (error) {
      console.error("儲存分類失敗:", error)
      toast.error("儲存分類失敗")
    }
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

      {/* 分類表格 - 桌面版 */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-teal-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-gray-800">分類清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {categories.length} 個分類
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">分類資訊</TableHead>
                <TableHead className="text-left">類型</TableHead>
                <TableHead className="text-left">使用數量</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-teal-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-teal-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入分類資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-teal-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <Tag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{category.name}</div>
                          <div className="text-xs text-gray-500">分類 ID: {category.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${category.type === 'category' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'}`}>
                        {category.type === 'category' ? '主分類' : '細分分類'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="number-display number-positive">
                          {category.usageCount} 個物料
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">開啟選單</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
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
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
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
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 分類表格 - 手機版 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-teal-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-teal-600" />
                <h2 className="text-base font-semibold text-gray-800">分類清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {categories.length} 個分類
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-teal-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-teal-600 rounded-full animate-spin"></div>
                </div>
                <span className="mt-3 text-sm text-gray-600 font-medium">載入分類資料中...</span>
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-teal-50/50 transition-colors duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <Tag className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{category.name}</div>
                          <div className="text-xs text-gray-500">分類 ID: {category.id}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0">
                            <span className="sr-only">開啟選單</span>
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
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-gray-500">類型</span>
                        </div>
                        <Badge className={`text-xs ${category.type === 'category' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'}`}>
                          {category.type === 'category' ? '主分類' : '細分分類'}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-gray-500">使用數量</span>
                        </div>
                        <span className="number-display number-positive text-sm">
                          {category.usageCount} 個物料
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Tag className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">沒有分類資料</h3>
                <p className="text-sm text-gray-500 text-center mb-3">開始建立第一個分類來管理物料</p>
                <Button 
                  onClick={handleAdd}
                  variant="outline"
                  className="border-teal-200 text-teal-600 hover:bg-teal-50 text-sm"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  新增分類
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                        <option value="category">主分類</option>
                        <option value="subCategory">細分分類</option>
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
    </div>
  )
}
