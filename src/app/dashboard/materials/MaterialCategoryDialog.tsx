"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { generateUniqueCategoryId, generateUniqueSubCategoryId } from "@/lib/utils"

import { toast } from "sonner"
import { Plus, Edit, Trash2, Tag, Calendar, MoreHorizontal, Eye, Package, X, Folder, FolderOpen, Building } from "lucide-react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DetailViewDialog } from '@/components/DetailViewDialog'

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

interface MaterialData {
  id: string
  code: string
  name: string
  category: string
  subCategory: string
  currentStock: number
  unit: string
  supplierName?: string
  supplierRef?: any
  createdAt?: any
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
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryMaterials, setCategoryMaterials] = useState<MaterialData[]>([])
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false)
  const [isMaterialDetailOpen, setIsMaterialDetailOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null)

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

      // 分開排序：先主分類再細分分類，各自按名稱排序
      const mainCategories = categoriesList.filter(cat => cat.type === 'category').sort((a, b) => a.name.localeCompare(b.name));
      const subCategories = categoriesList.filter(cat => cat.type === 'subCategory').sort((a, b) => a.name.localeCompare(b.name));
      setCategories([...mainCategories, ...subCategories]);
    } catch (error) {
      console.error("載入分類失敗:", error)
      toast.error("載入分類失敗")
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategoryMaterials = async (category: Category) => {
    setIsLoadingMaterials(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }

      const materialsRef = collection(db, 'materials')
      let materialsQuery

      if (category.type === 'category') {
        // 查詢主分類
        materialsQuery = query(materialsRef, where('category', '==', category.name))
      } else {
        // 查詢細分分類
        materialsQuery = query(materialsRef, where('subCategory', '==', category.name))
      }

      const materialsSnapshot = await getDocs(materialsQuery)
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaterialData[]

      // 獲取供應商名稱
      const materialsWithSupplier = await Promise.all(
        materialsList.map(async (material) => {
          if (material.supplierRef && db) {
            try {
              const supplierDoc = await getDocs(query(collection(db, 'suppliers'), where('__name__', '==', material.supplierRef.id)))
              if (!supplierDoc.empty) {
                material.supplierName = supplierDoc.docs[0].data().name
              }
            } catch (error) {
              console.error('獲取供應商名稱失敗:', error)
              material.supplierName = '讀取失敗'
            }
          }
          return material
        })
      )

      // 按名稱升序排序
      const sortedMaterials = materialsWithSupplier.sort((a, b) => a.name.localeCompare(b.name))
      setCategoryMaterials(sortedMaterials)
    } catch (error) {
      console.error('載入物料資料失敗:', error)
      toast.error('載入物料資料失敗')
    } finally {
      setIsLoadingMaterials(false)
    }
  }

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category)
    setIsDetailOpen(true)
    await loadCategoryMaterials(category)
  }

  const handleMaterialClick = (material: MaterialData) => {
    setSelectedMaterial(material)
    setIsMaterialDetailOpen(true)
  }

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const handleAdd = () => {
    setEditingCategory(null)
    form.reset({
      name: "",
      type: "category",
    })
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
      if (!db) {
        throw new Error("Firebase 未初始化")
      }

      // 確定要刪除的分類集合
      const collectionName = categoryToDelete.type === 'category' ? 'materialCategories' : 'materialSubCategories';
      
      // 刪除 Firestore 中的分類文檔
      await deleteDoc(doc(db, collectionName, categoryToDelete.id));
      
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
      if (!db) {
        throw new Error("Firebase 未初始化")
      }

      if (editingCategory) {
        // 更新現有分類
        const collectionName = editingCategory.type === 'category' ? 'materialCategories' : 'materialSubCategories';
        const oldName = editingCategory.name;
        
        // 更新分類文檔
        await updateDoc(doc(db, collectionName, editingCategory.id), {
          name: data.name,
          updatedAt: new Date(),
        });
        
        // 更新所有使用此分類的物料
        const materialsRef = collection(db, 'materials');
        let materialsQuery;
        
        if (editingCategory.type === 'category') {
          materialsQuery = query(materialsRef, where('category', '==', oldName));
        } else {
          materialsQuery = query(materialsRef, where('subCategory', '==', oldName));
        }
        
        const materialsSnapshot = await getDocs(materialsQuery);
        const batch = writeBatch(db);
        
        materialsSnapshot.docs.forEach(doc => {
          const updateData = editingCategory.type === 'category' 
            ? { category: data.name }
            : { subCategory: data.name };
          batch.update(doc.ref, updateData);
        });
        
        if (!materialsSnapshot.empty) {
          await batch.commit();
          console.log(`已更新 ${materialsSnapshot.size} 個物料的${editingCategory.type === 'category' ? '主分類' : '細分分類'}名稱`);
        }
        
        toast.success(`分類「${data.name}」已更新，並同步更新了 ${materialsSnapshot.size} 個相關物料`)
      } else {
        // 新增分類 - 生成唯一 ID
        let generatedId = '';
        if (data.type === 'category') {
          generatedId = await generateUniqueCategoryId(db);
        } else {
          generatedId = await generateUniqueSubCategoryId(db);
        }
        
        // 將分類寫入 Firestore
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
          <div className="space-y-6">
            {/* 主分類區塊 */}
            {categories.filter(cat => cat.type === 'category').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Folder className="h-5 w-5 text-blue-600" />
                  主分類
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.filter(cat => cat.type === 'category').map((category) => (
                    <div 
                      key={category.id}
                      className="bg-white rounded-xl shadow-lg border border-blue-100 p-4 hover:shadow-xl transition-all duration-200 cursor-pointer"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Folder className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {category.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              主分類 ID: 
                              <span className="font-mono bg-blue-100 px-1 rounded ml-1">
                                {category.generatedId || '待生成'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEdit(category);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              編輯分類
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(category);
                              }}
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
                          <Tag className="h-3 w-3 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500">分類類型</p>
                            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                              主分類
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
                  ))}
                </div>
              </div>
            )}

            {/* 細分分類區塊 */}
            {categories.filter(cat => cat.type === 'subCategory').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-green-600" />
                  細分分類
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.filter(cat => cat.type === 'subCategory').map((category) => (
                    <div 
                      key={category.id}
                      className="bg-white rounded-xl shadow-lg border border-green-100 p-4 hover:shadow-xl transition-all duration-200 cursor-pointer"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <FolderOpen className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {category.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              細分分類 ID: 
                              <span className="font-mono bg-green-100 px-1 rounded ml-1">
                                {category.generatedId || '待生成'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEdit(category);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              編輯分類
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(category);
                              }}
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
                          <Tag className="h-3 w-3 text-green-600" />
                          <div>
                            <p className="text-xs text-gray-500">分類類型</p>
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                              細分分類
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
                  ))}
                </div>
              </div>
            )}

            {/* 載入中狀態 */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
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
                ))}
              </div>
            )}

            {/* 無資料狀態 */}
            {!isLoading && categories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
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

      {/* 分類詳情對話框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              分類詳情
            </DialogTitle>
            <p className="text-gray-600 mt-2">
              {selectedCategory?.type === 'category' ? '主分類' : '細分分類'}，共 {selectedCategory?.usageCount} 個物料使用此分類
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* 分類資訊 */}
            {selectedCategory && (
              <div className="space-y-6 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 shadow-sm">
                <h3 className="text-xl font-bold flex items-center gap-3 text-teal-800">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Tag className="h-4 w-4 text-teal-600" />
                  </div>
                  分類資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">分類名稱</label>
                    <div className="text-lg font-medium text-gray-900">{selectedCategory.name}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">分類類型</label>
                    <div className="text-lg">
                      <Badge className={`${selectedCategory.type === 'category' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-cyan-100 text-cyan-800 border-cyan-200'}`}>
                        {selectedCategory.type === 'category' ? '主分類' : '細分分類'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">使用數量</label>
                    <div className="text-lg font-medium text-gray-900">{selectedCategory.usageCount} 個物料</div>
                  </div>
                </div>
              </div>
            )}

            {/* 物料列表 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <Package className="h-4 w-4" />
                使用此分類的物料
              </h3>
              
              {isLoadingMaterials ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-teal-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-teal-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入物料資料中...</span>
                </div>
              ) : categoryMaterials.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>物料資訊</TableHead>
                        <TableHead>分類</TableHead>
                        <TableHead>供應商</TableHead>
                        <TableHead>庫存</TableHead>
                        <TableHead>單位</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryMaterials.map((material) => (
                        <TableRow 
                          key={material.id} 
                          className="hover:bg-teal-50/50 transition-colors duration-200 cursor-pointer"
                          onClick={() => handleMaterialClick(material)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                                <Package className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{material.name}</div>
                                <div className="text-xs text-gray-500">代號: {material.code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {material.category && (
                                <div className="text-xs">
                                  <span className="text-gray-500">主分類:</span> {material.category}
                                </div>
                              )}
                              {material.subCategory && (
                                <div className="text-xs">
                                  <span className="text-gray-500">細分類:</span> {material.subCategory}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">
                                {material.supplierName || '未指定'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${
                                material.currentStock > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {material.currentStock}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{material.unit || '-'}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有使用此分類的物料</h3>
                  <p className="text-sm text-gray-500 text-center">
                    目前沒有物料使用「{selectedCategory?.name}」分類
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              關閉
            </Button>
            {selectedCategory && (
              <Button 
                onClick={() => {
                  setIsDetailOpen(false)
                  // 延遲一點時間確保詳情對話框完全關閉後再開啟編輯對話框
                  setTimeout(() => {
                    handleEdit(selectedCategory)
                  }, 100)
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Edit className="mr-2 h-4 w-4" />
                編輯分類
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 物料詳情對話框 */}
      <DetailViewDialog
        isOpen={isMaterialDetailOpen}
        onOpenChange={setIsMaterialDetailOpen}
        title="物料詳情"
        subtitle={selectedMaterial ? `查看物料「${selectedMaterial.name}」的詳細資訊` : ''}
        sections={selectedMaterial ? [
          {
            title: "基本資訊",
            icon: <Package className="h-4 w-4" />,
            color: "blue",
            fields: [
              {
                label: "物料名稱",
                value: selectedMaterial.name,
                icon: <Package className="h-3 w-3" />
              },
              {
                label: "物料代號",
                value: selectedMaterial.code,
                icon: <Tag className="h-3 w-3" />
              },
              {
                label: "單位",
                value: selectedMaterial.unit || '-',
                icon: <Package className="h-3 w-3" />
              }
            ]
          },
          {
            title: "分類資訊",
            icon: <Tag className="h-4 w-4" />,
            color: "green",
            fields: [
              {
                label: "主分類",
                value: selectedMaterial.category || '-',
                icon: <Tag className="h-3 w-3" />
              },
              {
                label: "細分分類",
                value: selectedMaterial.subCategory || '-',
                icon: <Tag className="h-3 w-3" />
              }
            ]
          },
          {
            title: "庫存資訊",
            icon: <Package className="h-4 w-4" />,
            color: "purple",
            fields: [
              {
                label: "當前庫存",
                value: selectedMaterial.currentStock,
                type: "number",
                icon: <Package className="h-3 w-3" />
              }
            ]
          },
          {
            title: "供應商資訊",
            icon: <Building className="h-4 w-4" />,
            color: "yellow",
            fields: [
              {
                label: "供應商",
                value: selectedMaterial.supplierName || '未指定',
                icon: <Building className="h-3 w-3" />
              }
            ]
          }
        ] : []}
        actions={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMaterialDetailOpen(false)}>
              關閉
            </Button>
            {selectedMaterial && (
              <Button 
                onClick={() => {
                  setIsMaterialDetailOpen(false)
                  // 這裡可以添加編輯物料的邏輯
                  // 或者導航到物料編輯頁面
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                編輯物料
              </Button>
            )}
          </div>
        }
      />

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
