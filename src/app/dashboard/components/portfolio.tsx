import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshPricesButton,
  Asset
} from "./portfolio-card"
import { useHoldingData } from "@/hooks/useHoldingData"

interface StockData {
  cost_basis: number
  logo_url: string
  market_value: number
  name: string
  price: number
  quantity: number
  ticker: string
}

export function Portfolio() {
  const {
    stockData
  } = useHoldingData()

  return (
    <Card variant="glow" className="relative flex flex-col gap-4 h-full">
      <CardHeader>
        <CardTitle className="text-xl">Portfolio</CardTitle>
        <CardAction>
          <RefreshPricesButton />
        </CardAction>
      </CardHeader>
      <CardContent className="h-full flex flex-col gap-4">
        <div className="flex-1 overflow-hidden w-full">
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col pb-4">
              <Card className="border-0 py-0 gap-1">
                <CardContent className="flex flex-col px-0 gap-2">
                  {stockData.length > 0 ? (
                    (stockData as StockData[]).map((stock) => (
                      <Asset
                        key={stock.ticker}
                        ticker={stock.ticker}
                        name={stock.name}
                        logoUrl={stock.logo_url}
                        quantity={stock.quantity}
                        totalAmount={stock.market_value}
                        pnlPct={stock.cost_basis > 0
                          ? (stock.market_value  / stock.cost_basis - 1) * 100
                          : 0
                        }
                        pnlNet={stock.market_value - stock.cost_basis}
                        price={stock.price}
                        type="stock"
                      />
                    ))
                  ) : (
                    <span className="self-center py-20 text-muted-foreground">
                      No stock holdings.
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
