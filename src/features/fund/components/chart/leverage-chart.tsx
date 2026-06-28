"use client"

import { formatNum } from "@/lib/utils"
import { Piechart } from "@/components/charts/piechart"
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { liabilityChart } from "@fund/config"

interface Props {
  equity: number
  debt: number
  margin: number
  totalAsset: number
}

export function LeverageChart({ equity, debt, margin, totalAsset }: Props) {
  const leverage = equity !== 0 ? (totalAsset - equity) / equity : Infinity
  const leverageDisplay = equity !== 0 ? leverage.toFixed(2) : "∞"

  const data = [
    { liability: "equity", allocation: equity },
    { liability: "debts", allocation: debt },
    { liability: "margin", allocation: margin },
  ].filter((d) => d.allocation > 0)

  return (
    <div className="flex flex-col gap-4 w-full">
      <CardHeader>
        <CardDescription>Leverage</CardDescription>
        <CardTitle className="text-base sm:text-xl">
          {leverageDisplay}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Piechart
          data={data}
          chartConfig={liabilityChart}
          dataKey="allocation"
          nameKey="liability"
          className="w-full max-h-50"
          innerRadius={65}
          legend="right"
          margin_tb={0}
          valueFormatter={(v) => `${formatNum((v / totalAsset) * 100, 1)}%`}
        />
      </CardContent>
    </div>
  )
}
