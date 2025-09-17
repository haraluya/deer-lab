"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react"
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface ImportExportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => Promise<void>
  onExport: () => Promise<any[]>
  title: string
  description: string
  sampleData: any[]
  fields: Array<{
    key: string
    label: string
    required?: boolean
    type?: "string" | "number" | "boolean"
    format?: "percentage" // 新增百分比格式
  }>
  color?: "blue" | "green" | "purple" | "yellow" | "red" | "orange" | "gray"
  showUpdateOption?: boolean
  maxBatchSize?: number
}

export function ImportExportDialog({
  isOpen,
  onOpenChange,
  onImport,
  onExport,
  title,
  description,
  sampleData,
  fields,
  color = "blue",
  showUpdateOption = false,
  maxBatchSize = 100
}: ImportExportDialogProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const [importResults, setImportResults] = useState<{ success: number; failed: number; failedItems: any[] }>({ success: 0, failed: 0, failedItems: [] })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      toast.error("請上傳 Excel (.xlsx) 或 CSV 檔案")
      return
    }

    try {
      let parsedData: any[] = []

      if (file.name.endsWith('.xlsx')) {
        // 解析 Excel 檔案
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // 移除標題行並轉換為物件格式
        if (parsedData.length > 1) {
          const headers = parsedData[0] as string[]
          parsedData = parsedData.slice(1).map((row: any) => {
            const obj: any = {}
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                obj[header] = row[index]
              }
            })
            return obj
          })
        }
      } else if (file.name.endsWith('.csv')) {
        // 解析 CSV 檔案
        const text = await file.text()
        const result = Papa.parse(text, { header: true, skipEmptyLines: true })
        parsedData = result.data as any[]
      }

      // 清理資料：移除空行和轉換資料類型
      parsedData = parsedData.filter(row => {
        return Object.values(row).some(value => value !== null && value !== undefined && value !== '')
      })

      // 轉換資料類型
      parsedData = parsedData.map((row, index) => {
        const cleanedRow: any = {}
        fields.forEach(field => {
          // 嘗試多種方式匹配欄位值
          let value = row[field.key] || row[field.label]
          
          // 如果還是沒有找到，嘗試模糊匹配
          if (value === undefined || value === null || value === '') {
            const rowKeys = Object.keys(row)
            const matchedKey = rowKeys.find(key => 
              key.toLowerCase().includes(field.key.toLowerCase()) ||
              key.toLowerCase().includes(field.label.toLowerCase())
            )
            if (matchedKey) {
              value = row[matchedKey]
            }
          }
          
          // 處理空值：將 undefined、null、空字串統一為空字串
          if (value === undefined || value === null || value === '') {
            cleanedRow[field.key] = ''
          } else {
            if (field.type === 'number') {
              cleanedRow[field.key] = Number(value)
            } else if (field.type === 'boolean') {
              cleanedRow[field.key] = Boolean(value)
            } else {
              cleanedRow[field.key] = String(value).trim()
            }
          }
        })
        
        // 調試日誌：檢查所有重要欄位
        if (index < 3) { // 只記錄前3筆資料的調試資訊
          console.log(`第 ${index + 1} 筆資料解析結果:`, {
            originalRow: row,
            cleanedRow: cleanedRow,
            supplierName: cleanedRow.supplierName,
            hasSupplierName: !!cleanedRow.supplierName,
            fragranceType: cleanedRow.fragranceType,
            hasFragranceType: !!cleanedRow.fragranceType,
            fragranceStatus: cleanedRow.fragranceStatus,
            hasFragranceStatus: !!cleanedRow.fragranceStatus,
            originalKeys: Object.keys(row)
          })
        }
        
        return cleanedRow
      })

      setImportData(parsedData)
      validateData(parsedData)
      toast.success(`成功解析 ${parsedData.length} 筆資料`)
    } catch (error) {
      console.error("檔案解析失敗:", error)
      toast.error("檔案解析失敗，請檢查檔案格式")
    }
  }

  const validateData = (data: any[]) => {
    const errors: string[] = []
    
    data.forEach((row, index) => {
      fields.forEach(field => {
        if (field.required && (!row[field.key] || row[field.key] === '')) {
          errors.push(`第 ${index + 1} 行：${field.label} 為必填欄位`)
        }
        
        if (field.type === "number" && row[field.key] && isNaN(Number(row[field.key]))) {
          errors.push(`第 ${index + 1} 行：${field.label} 必須為數字`)
        }
      })
    })
    
    setValidationErrors(errors)
  }

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error("請修正資料錯誤後再匯入")
      return
    }

    if (importData.length > maxBatchSize) {
      toast.error(`資料量過大，建議一次匯入不超過 ${maxBatchSize} 筆資料。目前有 ${importData.length} 筆資料。`)
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: importData.length })
    
    const results: { success: number; failed: number; failedItems: any[] } = { success: 0, failed: 0, failedItems: [] }

    try {
      await onImport(importData, {}, (current, total) => {
        setImportProgress({ current, total })
      })
      
      // 如果沒有拋出異常，表示全部成功
      results.success = importData.length
      setImportResults(results)
      
      toast.success(`資料匯入成功！共處理 ${importData.length} 筆資料`)
    } catch (error) {
      console.error("匯入失敗:", error)
      
      // 嘗試解析錯誤信息
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      
      // 檢查是否有詳細的結果信息
      if ((error as any).results) {
        // 使用詳細的結果信息
        const detailedResults = (error as any).results;
        results.success = detailedResults.success;
        results.failed = detailedResults.failed;
        results.failedItems = detailedResults.failedItems;
      } else if (errorMessage.includes('匯入產品')) {
        // 單個項目錯誤
        results.failed = 1
        results.success = importData.length - 1
        results.failedItems.push({
          item: importData[importProgress?.current || 0],
          error: errorMessage,
          row: (importProgress?.current || 0) + 1
        })
      } else {
        // 其他錯誤，標記所有項目為失敗
        results.failed = importData.length
        results.success = 0
        results.failedItems.push({
          item: null,
          error: errorMessage,
          row: 0
        })
      }
      
      setImportResults(results)
      
      if (results.success > 0) {
        toast.success(`資料匯入完成！成功 ${results.success} 筆，失敗 ${results.failed} 筆`)
      } else {
        toast.error("資料匯入失敗")
      }
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await onExport()
      
      // 建立 CSV 內容 (加入 BOM 解決中文亂碼問題)
      const headers = fields.map(f => f.label).join(',')
      const rows = data.map(row =>
        fields.map(f => {
          let value = row[f.key] || ''
          // 如果是百分比格式，轉換為小數
          if (f.format === 'percentage' && typeof value === 'number') {
            value = (value / 100).toFixed(2)
          }
          // 針對代碼欄位（可能包含前置0）做特殊處理
          if (f.key === 'code' && typeof value === 'string' && /^\d+$/.test(value)) {
            // 如果是純數字字串，在前面加上引號強制Excel視為文字
            value = `'${value}`
          }
          // 針對數值型欄位保護小數點格式
          if (f.type === 'number' && typeof value === 'number') {
            // 保持數值精度，避免科學記號
            value = value.toString()
          }
          return `"${value}"`
        }).join(',')
      ).join('\n')
      const csvContent = `${headers}\n${rows}`
      
      // 加入 BOM (Byte Order Mark) 解決中文亂碼
      const BOM = '\uFEFF'
      const csvWithBOM = BOM + csvContent
      
      // 下載檔案
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("資料匯出成功")
    } catch (error) {
      console.error("匯出失敗:", error)
      toast.error("資料匯出失敗")
    } finally {
      setIsExporting(false)
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          header: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
          title: "text-blue-800",
          icon: "text-blue-600",
          button: "bg-blue-600 hover:bg-blue-700 text-white"
        }
      case "green":
        return {
          header: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
          title: "text-green-800",
          icon: "text-green-600",
          button: "bg-green-600 hover:bg-green-700 text-white"
        }
      case "purple":
        return {
          header: "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200",
          title: "text-purple-800",
          icon: "text-purple-600",
          button: "bg-purple-600 hover:bg-purple-700 text-white"
        }
      case "yellow":
        return {
          header: "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200",
          title: "text-yellow-800",
          icon: "text-yellow-600",
          button: "bg-yellow-600 hover:bg-yellow-700 text-white"
        }
      case "red":
        return {
          header: "bg-gradient-to-r from-red-50 to-pink-50 border-red-200",
          title: "text-red-800",
          icon: "text-red-600",
          button: "bg-red-600 hover:bg-red-700 text-white"
        }
      case "gray":
        return {
          header: "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200",
                  title: "text-foreground",
        icon: "text-muted-foreground",
          button: "bg-gray-600 hover:bg-gray-700 text-white"
        }
      default:
        return {
          header: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
          title: "text-blue-800",
          icon: "text-blue-600",
          button: "bg-blue-600 hover:bg-blue-700 text-white"
        }
    }
  }

  const colorClasses = getColorClasses(color)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white" aria-describedby="import-export-dialog-description">
                 <DialogHeader className={`pb-4 border-b ${colorClasses.header}`}>
           <DialogTitle className={`flex items-center gap-3 text-2xl font-bold ${colorClasses.title}`}>
             <div className={`w-10 h-10 ${colorClasses.header} rounded-lg flex items-center justify-center`}>
               <FileSpreadsheet className={`h-5 w-5 ${colorClasses.icon}`} />
             </div>
             {title} - 匯入/匯出
           </DialogTitle>
           <DialogDescription className="text-muted-foreground mt-2" id="import-export-dialog-description">{description}</DialogDescription>
         </DialogHeader>

                   {/* 匯入/匯出規則說明 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">匯入/匯出規則</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>智能匹配模式</strong>：系統會根據物料代號自動判斷是新增還是更新</p>
              <p>• <strong>新增邏輯</strong>：如果物料代號不存在，系統會建立新的物料項目</p>
              <p>• <strong>更新邏輯</strong>：如果物料代號已存在，系統會更新覆蓋有填入的欄位</p>
              <p>• <strong>必填欄位</strong>：物料名稱為必填項目</p>
              <p>• <strong>物料代號</strong>：如果未提供，系統會自動生成</p>
              <p>• <strong>注意事項</strong>：供應商名稱如果不存在會自動建立</p>
              <p>• <strong>支援格式</strong>：Excel (.xlsx) 和 CSV 檔案格式</p>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 匯入區塊 */}
          <Card className={`${colorClasses.header} border-2`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-3 text-lg font-bold ${colorClasses.title}`}>
                <div className={`w-8 h-8 ${colorClasses.header} rounded-lg flex items-center justify-center`}>
                  <Upload className={`h-4 w-4 ${colorClasses.icon}`} />
                </div>
                資料匯入
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                上傳 Excel (.xlsx) 或 CSV 檔案來匯入資料
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">選擇檔案</label>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {showUpdateOption && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-700">
                    <strong>智能匹配模式：</strong>系統會根據物料代號自動判斷是新增還是更新
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>• 如果物料代號已存在 → 更新現有資料</li>
                      <li>• 如果物料代號不存在 → 新增新物料</li>
                      <li>• 如果未提供物料代號 → 自動生成新代號並新增</li>
                    </ul>
                  </div>
                </div>
              )}



               {importData.length > 0 && (
                 <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                   <div className="text-sm text-yellow-800">
                     <strong>建議：</strong>一次匯入不超過 {maxBatchSize} 筆資料以確保穩定性。目前有 {importData.length} 筆資料。
                     {importData.length > maxBatchSize && (
                       <span className="text-red-600 font-semibold"> 建議分批匯入！</span>
                     )}
                   </div>
                 </div>
               )}

              {importData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">預覽資料 ({importData.length} 筆)</label>
                    <Badge variant={validationErrors.length > 0 ? "destructive" : "default"}>
                      {validationErrors.length > 0 ? `${validationErrors.length} 個錯誤` : "資料正確"}
                    </Badge>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {fields.map(field => (
                            <th key={field.key} className="text-left p-1">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-b">
                            {fields.map(field => (
                              <td key={field.key} className="p-1">
                                {row[field.key] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 5 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        顯示前 5 筆，共 {importData.length} 筆資料
                      </div>
                    )}
                  </div>

                  {validationErrors.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        驗證錯誤
                      </label>
                      <div className="max-h-20 overflow-y-auto text-xs text-red-600 space-y-1">
                        {validationErrors.map((error, index) => (
                          <div key={index}>{error}</div>
                        ))}
                      </div>
                    </div>
                  )}

                                      {(importResults.success > 0 || importResults.failed > 0) && (
                     <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                       <h5 className="font-semibold text-blue-800 mb-2">匯入結果</h5>
                       <div className="text-sm text-blue-700 space-y-1">
                         <p>✅ 成功匯入: {importResults.success} 筆</p>
                         <p>❌ 失敗匯入: {importResults.failed} 筆</p>
                         {importResults.failedItems.length > 0 && (
                           <>
                             <p className="font-semibold text-red-800 mt-2">失敗項目詳情:</p>
                             <div className="max-h-32 overflow-y-auto">
                               <ul className="text-xs text-red-700 space-y-1">
                                 {importResults.failedItems.map((item, index) => (
                                   <li key={index} className="border-l-2 border-red-300 pl-2">
                                     <span className="font-medium">第 {item.row} 行:</span> {item.error}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                           </>
                         )}
                       </div>
                     </div>
                   )}

                                     {importProgress && (
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span>處理進度</span>
                         <span>{importProgress.current} / {importProgress.total}</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <div 
                           className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                           style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                         ></div>
                       </div>
                     </div>
                   )}

                   <Button 
                     onClick={handleImport} 
                     disabled={isImporting || validationErrors.length > 0}
                     className={`w-full ${colorClasses.button}`}
                   >
                     {isImporting ? "匯入中..." : "確認匯入"}
                   </Button>
                   
                   {(importResults.success > 0 || importResults.failed > 0) && (
                     <Button 
                       onClick={() => onOpenChange(false)}
                       variant="outline"
                       className="w-full"
                     >
                       關閉
                     </Button>
                   )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 匯出區塊 */}
          <Card className={`${colorClasses.header} border-2`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-3 text-lg font-bold ${colorClasses.title}`}>
                <div className={`w-8 h-8 ${colorClasses.header} rounded-lg flex items-center justify-center`}>
                  <Download className={`h-4 w-4 ${colorClasses.icon}`} />
                </div>
                資料匯出
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                將現有資料匯出為 CSV 格式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">匯出欄位</label>
                <div className="space-y-1">
                  {fields.map(field => (
                    <div key={field.key} className="flex items-center gap-2 text-sm">
                      <span>{field.label}</span>
                      {field.required && <Badge variant="secondary" className="text-xs">必填</Badge>}
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className={`w-full ${colorClasses.button}`}
              >
                {isExporting ? "匯出中..." : "匯出 CSV"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
