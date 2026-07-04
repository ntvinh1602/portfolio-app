"use client"

import { useState, useEffect } from "react"
import { usePerformanceYear } from "./context"
import { TopStocks } from "./top-stocks"
import { getStocks, getStocksAll } from "@/features/fund/actions/get-performance"
import type { StocksView } from "@/features/fund/actions/get-performance"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AssetItemSkeleton } from "@/components/skeletons/item"

export function TopStocksSection() {
  const { year } = usePerformanceYear()
  const [data, setData] = useState<StocksView>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (year === null) return
    let cancelled = false
    setData([])
    setLoading(true)

    const fn = year === 9999 ? getStocksAll : () => getStocks(year)
    fn()
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [year])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <AssetItemSkeleton />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <AssetItemSkeleton />
          <AssetItemSkeleton />
          <AssetItemSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (!data.length) return null

  return (
    <TopStocks year={year!} stockData={data} />
  )
}
