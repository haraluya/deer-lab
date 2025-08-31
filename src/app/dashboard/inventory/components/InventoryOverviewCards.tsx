"use client"

import { Package, FlaskConical, DollarSign, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface InventoryOverview {
  totalMaterials: number
  totalFragrances: number
  totalMaterialCost: number
  totalFragranceCost: number
  lowStockMaterials: number
  lowStockFragrances: number
  totalLowStock: number
}

interface InventoryOverviewCardsProps {
  overview: InventoryOverview | null
  loading: boolean
}

export function InventoryOverviewCards({ overview, loading }: InventoryOverviewCardsProps) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "總物料數",
      value: overview.totalMaterials,
      description: `${overview.lowStockMaterials} 項低庫存`,
      icon: Package,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "總香精數", 
      value: overview.totalFragrances,
      description: `${overview.lowStockFragrances} 項低庫存`,
      icon: FlaskConical,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50", 
      borderColor: "border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      title: "總物料成本",
      value: `NT$ ${overview.totalMaterialCost.toLocaleString()}`,
      description: "當前庫存價值",
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      borderColor: "border-green-200", 
      iconColor: "text-green-600"
    },
    {
      title: "總香精成本",
      value: `NT$ ${overview.totalFragranceCost.toLocaleString()}`, 
      description: "當前庫存價值",
      icon: DollarSign,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      borderColor: "border-orange-200",
      iconColor: "text-orange-600"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card 
          key={index}
          className={`${card.borderColor} bg-gradient-to-br ${card.bgGradient} hover:shadow-lg transition-all duration-200 hover:scale-105`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
              {card.value}
            </div>
            <p className={`text-xs ${card.iconColor} mt-1 opacity-80`}>
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}