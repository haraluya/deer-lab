"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { generateUniqueCategoryId, generateUniqueSubCategoryId } from "@/lib/utils"

import { toast } from "sonner"
import { Tag, Folder, FolderOpen, Building, AlertCircle, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Category {
  id: string
  name: string
  type: "category" | "subCategory"
  usageCount: number
  generatedId?: string
}

interface CategoryFormDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null  // 編輯時傳入分類資料
  onSave: () => void  // 保存後的回調
}

export function CategoryFormDialog({ isOpen, onOpenChange, category, onSave }: CategoryFormDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"category" | "subCategory">("category")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 監聽 category 變化來設置初始值
  useEffect(() => {
    if (isOpen) {
      if (category) {
        // 編輯模式 - 載入現有資料
        console.log('載入編輯資料:', category)
        setName(category.name)
        setType(category.type)
      } else {
        // 新增模式 - 重置為預設值
        console.log('新增模式，重置表單')
        setName("")
        setType("category")
      }
    }
  }, [isOpen, category])

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("請輸入分類名稱")
      return
    }

    if (!db) {
      toast.error("資料庫未初始化")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading(category ? "正在更新分類..." : "正在新增分類...")

    try {
      if (category) {
        // 編輯模式 - 更新現有分類
        const collectionName = category.type === 'category' ? 'materialCategories' : 'materialSubCategories'
        const oldName = category.name
        
        // 更新分類文檔
        await updateDoc(doc(db, collectionName, category.id), {
          name: name.trim(),
          updatedAt: new Date(),
        })
        
        // 如果名稱改變了，需要更新所有使用此分類的物料
        if (oldName !== name.trim()) {
          const materialsRef = collection(db, 'materials')
          let materialsQuery
          
          if (category.type === 'category') {
            materialsQuery = query(materialsRef, where('category', '==', oldName))
          } else {
            materialsQuery = query(materialsRef, where('subCategory', '==', oldName))
          }
          
          const materialsSnapshot = await getDocs(materialsQuery)
          
          if (!materialsSnapshot.empty) {
            const batch = writeBatch(db)
            
            materialsSnapshot.docs.forEach(doc => {
              const updateData = category.type === 'category' 
                ? { category: name.trim() }
                : { subCategory: name.trim() }
              batch.update(doc.ref, updateData)
            })
            
            await batch.commit()
            console.log(`已更新 ${materialsSnapshot.size} 個物料的${category.type === 'category' ? '主分類' : '細分分類'}名稱`)
          }
        }
        
        toast.success(`分類「${name.trim()}」已成功更新`, { id: toastId })
      } else {
        // 新增模式 - 建立新分類
        let generatedId = ''
        if (type === 'category') {
          generatedId = await generateUniqueCategoryId(db)
        } else {
          generatedId = await generateUniqueSubCategoryId(db)
        }
        
        const collectionName = type === 'category' ? 'materialCategories' : 'materialSubCategories'
        const categoryData = {
          id: generatedId,
          name: name.trim(),
          type: type,
          createdAt: new Date(),
          ...(type === 'subCategory' && { parentCategory: '未指定' })
        }
        
        await addDoc(collection(db, collectionName), categoryData)
        
        toast.success(`${type === 'category' ? '主分類' : '細分分類'}「${name.trim()}」已成功新增 (ID: ${generatedId})`, { id: toastId })
      }

      onSave() // 觸發父組件重新載入資料
      onOpenChange(false) // 關閉對話框
    } catch (error) {
      console.error("儲存分類失敗:", error)
      toast.error("儲存分類失敗，請稍後再試", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = !!category

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isEditing ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'
            }`}>
              {isEditing ? <Tag className="h-4 w-4 text-white" /> : <Folder className="h-4 w-4 text-white" />}
            </div>
            {isEditing ? "編輯分類" : "新增分類"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditing ? "修改物料分類的資訊" : "建立新的物料分類"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 分類說明卡片 */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                分類說明
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-blue-700 space-y-2">
              <div className="flex items-center gap-2">
                <Folder className="h-3 w-3" />
                <span><strong>主分類</strong>：物料的大類別 (如：紙盒、塑膠、金屬等)</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3 w-3" />
                <span><strong>細分分類</strong>：主分類下的詳細分類 (如：彩盒、鋁箔袋等)</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* 分類名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                分類名稱 *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="請輸入分類名稱 (例如：紙盒、彩盒)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                required
              />
            </div>

            {/* 分類類型 - 編輯時不允許修改 */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                分類類型 *
              </Label>
              {isEditing ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${
                    category.type === 'category' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {category.type === 'category' ? <Folder className="h-3 w-3" /> : <FolderOpen className="h-3 w-3" />}
                  </div>
                  <span className="text-sm text-gray-600">
                    {category.type === 'category' ? '主分類' : '細分分類'}
                    <span className="text-xs text-gray-400 ml-2">(編輯時不可修改)</span>
                  </span>
                </div>
              ) : (
                <Select value={type} onValueChange={(value: "category" | "subCategory") => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">
                      <div className="flex items-center gap-2">
                        <Folder className="h-3 w-3 text-blue-600" />
                        <span>主分類</span>
                        <span className="text-xs text-gray-400">(2位大寫英文代號)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="subCategory">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-3 w-3 text-green-600" />
                        <span>細分分類</span>
                        <span className="text-xs text-gray-400">(3位數字代號)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ID 生成提示 */}
          {!isEditing && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                系統會自動為此分類生成唯一的{type === 'category' ? '2位英文' : '3位數字'}代號
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isEditing ? "更新中..." : "新增中..."}</span>
                </div>
              ) : (
                <span>{isEditing ? "更新分類" : "新增分類"}</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}