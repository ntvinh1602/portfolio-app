"use client"

import { useState, useEffect } from "react"
import { usePerformanceYear } from "./context"
import { Cashflow } from "./cashflow"
import { getCashflow, getCashflowAllTime } from "@/features/fund/actions/get-performance"
import type { CashflowView } from "@/features/fund/actions/get-performance"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AssetItemSkeleton } from "@/components/skeletons/item"

export function CashflowSection() {
  const { year } = usePerformanceYear()
  const [data, setData] = useState<CashflowView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (year === null) return
    let cancelled = false
    setData(null)
    setLoading(true)
    setError(null)

    const fn = year === 9999 ? getCashflowAllTime : () => getCashflow(year)
    fn()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [year])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <AssetItemSkeleton />
        </CardHeader>
        <CardContent>
          <AssetItemSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) return null

  return (
    <Cashflow deposits={data.deposits} withdrawals={data.withdrawals} />
  )
}
