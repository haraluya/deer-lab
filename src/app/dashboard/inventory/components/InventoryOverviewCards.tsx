"use client"

import { Package, FlaskConical, DollarSign, TrendingDown } from "lucide-react"
import { StandardStatsCard, StandardStats } from "@/components/StandardStatsCard"
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
    return <StandardStatsCard stats={[]} />
  }

  const stats: StandardStats[] = [
    {
      title: "總物料數",
      value: overview.totalMaterials,
      subtitle: `${overview.lowStockMaterials} 項低庫存`,
      icon: <Package />,
      color: "blue"
    },
    {
      title: "總香精數", 
      value: overview.totalFragrances,
      subtitle: `${overview.lowStockFragrances} 項低庫存`,
      icon: <FlaskConical />,
      color: "purple"
    },
    {
      title: "總物料成本",
      value: `$${overview.totalMaterialCost.toLocaleString()}`,
      subtitle: "當前庫存價值",
      icon: <DollarSign />,
      color: "green"
    },
    {
      title: "總香精成本",
      value: `$${overview.totalFragranceCost.toLocaleString()}`, 
      subtitle: "當前庫存價值",
      icon: <DollarSign />,
      color: "orange"
    }
  ]

  return <StandardStatsCard stats={stats} />
}