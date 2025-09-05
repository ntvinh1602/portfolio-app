import { useMemo } from "react"
import { SecurityItem, SecuritySkeleton } from "@/components/list-item/security"
import { useMarketData } from "@/hooks/use-market-data"
import { StockData } from "@/types/dashboard-data"

interface StockHoldingsProps {
  variant?: "compact" | "full"
  data: StockData[] | null
}

export function StockHoldings({ variant = "full", data }: StockHoldingsProps) {
  const stockSymbols = useMemo(() => data?.map(stock => stock.ticker) ?? [], [data])
  const { data: marketData } = useMarketData(stockSymbols)

  return (
    <div className="flex flex-col gap-3 text-muted-foreground">
      <div className="flex flex-col gap-1 font-thin">
        {!data ?
          Array.from({ length: 2 }).map((_, index) => (
            <SecuritySkeleton key={index} />
          )) : data.length > 0 ?
            data.map((stock) => {
              const livePrice = marketData[stock.ticker]?.price
              const totalAmount = livePrice
                ? livePrice * stock.quantity * 1000
                : stock.total_amount
              const pnlNet = totalAmount - stock.cost_basis - totalAmount * 0.00127
              const pnlPct = stock.cost_basis > 0
                ? (totalAmount * 0.99873 / stock.cost_basis - 1) * 100
                : 0

              return (
                <SecurityItem
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                  logoUrl={stock.logo_url}
                  quantity={stock.quantity}
                  totalAmount={totalAmount}
                  pnlPct={pnlPct}
                  pnlNet={pnlNet}
                  price={livePrice ?? stock.latest_price / 1000}
                  variant={variant}
                  type="stock"
                />
              )
            }) : <span className="text-center min-h-[100px] flex items-center justify-center">No stock holdings.</span>
        }
      </div>
    </div>
  )
}