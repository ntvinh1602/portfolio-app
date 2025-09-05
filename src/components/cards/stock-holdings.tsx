import { SecurityItem, SecuritySkeleton } from "@/components/list-item/security"
import { useAssetData } from "@/context/asset-data-context"
import { Loading } from "../loader"

interface StockHoldingsProps {
  variant?: "compact" | "full"
}

export function StockHoldings({ variant = "full" }: StockHoldingsProps) {
  const { processedStockData, loading } = useAssetData()
  
  if (loading) {
    return (
      <Loading/>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-muted-foreground">
      <div className="flex flex-col gap-1 font-thin">
        {processedStockData.length > 0 ?
            processedStockData.map((stock) => {
              return (
                <SecurityItem
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                  logoUrl={stock.logo_url}
                  quantity={stock.quantity}
                  totalAmount={stock.totalAmount}
                  pnlPct={stock.pnlPct}
                  pnlNet={stock.pnlNet}
                  price={stock.price}
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