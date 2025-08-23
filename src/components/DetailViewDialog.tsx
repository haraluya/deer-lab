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
        return `NT$ ${Number(value).toLocaleString()}`
      
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
          {sections.map((section, sectionIndex) => (
            <Card key={sectionIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {section.icon}
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
          ))}
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
