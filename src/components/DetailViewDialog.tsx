"use client"

import { useState } from "react"
import { X, Calendar, User, Package, Building, Tag } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DetailField {
  label: string
  value: any
  type?: "text" | "number" | "date" | "badge" | "currency" | "percentage"
  icon?: React.ReactNode
}

interface DetailSection {
  title: string
  icon?: React.ReactNode
  fields: DetailField[]
  color?: "blue" | "green" | "purple" | "yellow" | "red" | "gray"
}

interface DetailViewDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  sections: DetailSection[]
  actions?: React.ReactNode
}

export function DetailViewDialog({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  sections,
  actions
}: DetailViewDialogProps) {

  const formatValue = (value: any, type: string = "text") => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-400">-</span>
    }

    switch (type) {
      case "date":
        if (value?.toDate) {
          return new Date(value.toDate()).toLocaleString('zh-TW')
        }
        return new Date(value).toLocaleString('zh-TW')
      
      case "badge":
        const getBadgeVariant = (status: string) => {
          switch (status.toLowerCase()) {
            case "active":
            case "啟用":
              return "default"
            case "inactive":
            case "停用":
              return "secondary"
            case "discontinued":
            case "已下架":
              return "destructive"
            default:
              return "outline"
          }
        }
        const getBadgeText = (status: string) => {
          switch (status.toLowerCase()) {
            case "active":
              return "啟用"
            case "inactive":
              return "停用"
            case "discontinued":
              return "已下架"
            default:
              return status
          }
        }
        return <Badge variant={getBadgeVariant(value)}>{getBadgeText(value)}</Badge>
      
      case "currency":
        return `NT$ ${Math.round(Number(value)).toLocaleString()}`
      
      case "percentage":
        return `${value}%`
      
      case "number":
        return Number(value).toLocaleString()
      
      default:
        return String(value)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="detail-view-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {title}
          </DialogTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground" id="detail-view-dialog-description">{subtitle}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {sections.map((section, sectionIndex) => {
            const getColorClasses = (color?: string) => {
              switch (color) {
                case "blue":
                  return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                case "green":
                  return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                case "purple":
                  return "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200"
                case "yellow":
                  return "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
                case "red":
                  return "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                case "gray":
                  return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
                default:
                  return "bg-white border-gray-200"
              }
            }
            
            const getTitleColor = (color?: string) => {
              switch (color) {
                case "blue":
                  return "text-blue-800"
                case "green":
                  return "text-green-800"
                case "purple":
                  return "text-purple-800"
                case "yellow":
                  return "text-yellow-800"
                case "red":
                  return "text-red-800"
                case "gray":
                  return "text-gray-800"
                default:
                  return "text-gray-800"
              }
            }
            
            return (
              <Card key={sectionIndex} className={getColorClasses(section.color)}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg font-bold flex items-center gap-3 ${getTitleColor(section.color)}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      section.color === "blue" ? "bg-blue-100" :
                      section.color === "green" ? "bg-green-100" :
                      section.color === "purple" ? "bg-purple-100" :
                      section.color === "yellow" ? "bg-yellow-100" :
                      section.color === "red" ? "bg-red-100" :
                      section.color === "gray" ? "bg-gray-100" :
                      "bg-gray-100"
                    }`}>
                      <div className={`${
                        section.color === "blue" ? "text-blue-600" :
                        section.color === "green" ? "text-green-600" :
                        section.color === "purple" ? "text-purple-600" :
                        section.color === "yellow" ? "text-yellow-600" :
                        section.color === "red" ? "text-red-600" :
                        section.color === "gray" ? "text-gray-600" :
                        "text-gray-600"
                      }`}>
                        {section.icon}
                      </div>
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((field, fieldIndex) => (
                      <div key={fieldIndex} className="space-y-1">
                        <div className="flex items-center gap-1">
                          {field.icon}
                          <label className="text-sm font-medium text-muted-foreground">
                            {field.label}
                          </label>
                        </div>
                        <div className="text-sm">
                          {formatValue(field.value, field.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {actions && (
          <>
            <div className="border-t pt-4">
              <div className="flex justify-end gap-2">
                {actions}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
