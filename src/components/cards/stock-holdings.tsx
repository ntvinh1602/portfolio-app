import { SecurityItem, SecuritySkeleton } from "@/components/list-item/security"
import { StockData } from "@/types/dashboard-data"

interface StockHoldingsProps {
  variant?: "compact" | "full"
  data: StockData[] | null
}

export function StockHoldings({ variant = "full", data }: StockHoldingsProps) {

  return (
    <div className="flex flex-col gap-3 text-muted-foreground">
      <div className="flex flex-col gap-1 font-thin">
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
            )) : <span className="text-center min-h-[100px] flex items-center justify-center">No stock holdings.</span>
        }
      </div>
    </div>
  )
}