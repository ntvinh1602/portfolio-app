import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshPricesButton, Asset } from "./portfolio-card"
import { useHoldingData } from "@/hooks/useHoldingData"
import { Button } from "@/components/ui/button"
import { BalanceSheet } from "./balance-sheet"

export function Portfolio() {
  const { data: stockData } = useHoldingData()

  const maxVisible = 3
  const hasMore = stockData.length > maxVisible
  const hiddenCount = hasMore ? stockData.length - maxVisible : 0
  const displayedStocks = hasMore ? stockData.slice(0, maxVisible) : stockData

  return (
    <Card className="flex flex-col gap-4 min-h-90
      backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent"
    >
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="text-lg font-normal">Portfolio</CardTitle>
        <CardAction className="flex gap-2">
          <BalanceSheet/>
          <RefreshPricesButton />
        </CardAction>
      </CardHeader>

      <CardContent className="h-fit flex flex-col gap-1">
        {stockData.length > 0 ? (
          <>
            {displayedStocks.map((stock) => (
              <Asset
                key={stock.ticker}
                ticker={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                quantity={stock.quantity}
                totalAmount={stock.market_value}
                pnlPct={
                  stock.cost_basis > 0
                    ? (stock.market_value / stock.cost_basis - 1) * 100
                    : 0
                }
                pnlNet={stock.market_value - stock.cost_basis}
                price={stock.price}
                type="stock"
              />
            ))}

            {hasMore && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    // placeholder for future modal or navigation
                    console.log("View full list clicked")
                  }}
                >
                  ...and {hiddenCount} more
                </Button>
              </div>
            )}
          </>
        ) : (
          <span className="self-center py-20 text-muted-foreground">
            No stock holdings.
          </span>
        )}
      </CardContent>
    </Card>
  )
}