import * as React from "react"
import { Piechart } from "@/components/charts/piechart"
import { SecurityItem, SecuritySkeleton } from "@/components/list-item/security"
import { StockHolding } from "@/types/holdings"
import { ChartConfig } from "@/components/ui/chart"

interface StockHoldingsProps {
  variant?: "compact" | "full"
  data: (StockHolding & {total_amount: number})[] | null
}

export function StockHoldings({ variant = "full", data }: StockHoldingsProps) {
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      allocation: {
        label: "Allocation",
      },
    }
    data?.filter(item => item.total_amount > 0).forEach((item, index) => {
      config[item.ticker] = {
        label: item.ticker,
        color: `var(--chart-${index + 1})`,
      }
    })
    return config
  }, [data])

  const chartData = React.useMemo(() => {
    return data?.filter(item => item.total_amount > 0).map(item => ({
      asset: item.ticker,
      allocation: item.total_amount,
      fill: `var(--color-${item.ticker})`,
    }))
  }, [data])

  return (
    <div>
      {variant === "full" && 
        <Piechart 
          data={chartData}
          chartConfig={chartConfig}
          dataKey="allocation"
          nameKey="asset"
          legend="right"
          label_pos={1.5}
          className="max-h-[250px] w-full"
        />
      }
      <div className="flex flex-col gap-1 text-muted-foreground font-thin">
        {!data ? 
          Array.from({ length: 2 }).map((_, index) => (
            <SecuritySkeleton key={index} />
          )) : data.length > 0 ?
            data.map((stock) => (
              <SecurityItem
                key={stock.ticker}
                ticker={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                quantity={stock.quantity}
                totalAmount={stock.total_amount}
                pnlPct={stock.cost_basis > 0
                  ? (stock.total_amount / stock.cost_basis - 1) * 100
                  : 0
                }
                pnlNet={stock.total_amount - stock.cost_basis}
                price={stock.latest_price / 1000}
                variant={variant}
                type="stock"
              />
            )) : 
            <div className="text-center py-4">No stock holdings found.</div>
        }
      </div>
    </div>
  )
}