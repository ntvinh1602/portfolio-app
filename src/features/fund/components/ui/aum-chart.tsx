"use client"

import { formatNum } from "@/lib/utils"
import { Piechart } from "@/components/charts/piechart"
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

interface Props {
  cash: number
  stock: number
  fund: number
  totalAsset: number
}

export function AumChart({ cash, stock, fund, totalAsset }: Props) {
  const data = [
    { asset: "cash", allocation: cash },
    { asset: "stock", allocation: stock },
    { asset: "fund", allocation: fund },
  ].filter((d) => d.allocation > 0)

  return (
    <div className="flex flex-col gap-4 w-full">
      <CardHeader>
        <CardDescription>Total AUM</CardDescription>
        <CardTitle className="text-base sm:text-xl">
          {formatNum(totalAsset)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Piechart
          data={data}
          chartConfig={{
            cash: { label: "Cash", color: "var(--chart-1)" },
            stock: { label: "Stock", color: "var(--chart-2)" },
            fund: { label: "Fund", color: "var(--chart-3)" },
          }}
          dataKey="allocation"
          nameKey="asset"
          className="w-full max-h-50"
          innerRadius={65}
          legend="right"
          margin_tb={0}
        />
      </CardContent>
    </div>
  )
}
