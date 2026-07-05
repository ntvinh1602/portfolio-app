"use client"

import { useMemo } from "react"
import { Portfolio, PortfolioSkeleton } from "../ui/portfolio"
import { useBalanceSheet } from "@fund/hooks/use-dashboard-data"
import type { BSheetView } from "@fund/fund.types"
import StatusLabel from "@/components/status-label"

function usePortfolioMetrics(data: BSheetView[] | undefined) {
  return useMemo(() => {
    if (!data) return null
    const equity = data
      .filter((r) => r.asset_class === "equity")
      .reduce((sum, r) => sum + r.total_value, 0)

    const cash = data
      .filter((r) => r.asset_class == "cash")
      .reduce((sum, r) => sum + r.total_value, 0)

    const stock = data
      .filter((r) => r.asset_class == "stock")
      .reduce((sum, r) => sum + r.total_value, 0)

    const fund = data
      .filter((r) => r.asset_class == "fund")
      .reduce((sum, r) => sum + r.total_value, 0)

    const margin = data.find((r) => r.ticker == "MARGIN")?.total_value || 0
    const totalAsset = cash + stock + fund
    const debt = totalAsset - equity - margin

    return { equity, cash, stock, fund, margin, totalAsset, debt }
  }, [data])
}

export function PortfolioSection() {
  const { data, error, isLoading } = useBalanceSheet()
  const metrics = usePortfolioMetrics(data)

  if (isLoading) return <PortfolioSkeleton />
  if (error) return <StatusLabel type="error" />
  if (!data || !metrics) return null

  return <Portfolio bsheet={data} {...metrics} />
}
