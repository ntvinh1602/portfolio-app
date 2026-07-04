"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { Cashflow } from "./cashflow"
import { useCashflow } from "@fund/hooks/use-performance-data"
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import StatusLabel from "@/components/status-label"

function useCashflowSummary(
  deposits: number | undefined,
  withdrawals: number | undefined,
) {
  return useMemo(() => {
    const inflow = deposits ?? 0
    const outflow = Math.abs(withdrawals ?? 0)
    const net = inflow + (withdrawals ?? 0)
    return { inflow, outflow, net }
  }, [deposits, withdrawals])
}

export function CashflowSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useCashflow(year)
  const { inflow, outflow, net } = useCashflowSummary(
    data?.deposits,
    data?.withdrawals,
  )

  if (isLoading) return <StatusLabel type="loading" />
  if (error) return <StatusLabel type="error" />
  if (!data) return null

  return (
    <Cashflow net={net}>
      <ItemGroup className="bg-muted/50 rounded-2xl p-2">
        <Item size="xs">
          <ItemContent>
            <ItemTitle>Deposit</ItemTitle>
          </ItemContent>
          <ItemContent>
            <ItemTitle>{formatNum(inflow)}</ItemTitle>
          </ItemContent>
        </Item>
        <Item size="xs">
          <ItemContent>
            <ItemTitle>Withdraw</ItemTitle>
          </ItemContent>
          <ItemContent>
            <ItemTitle>{formatNum(outflow)}</ItemTitle>
          </ItemContent>
        </Item>
      </ItemGroup>
    </Cashflow>
  )
}
