import { useState } from "react"
import * as Card from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshPricesButton,
  Asset
} from "./portfolio-card"
import { TabSwitcher } from "@/components/tab-switcher"
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
  const [category, setCategory] = useState<"stock" | "crypto">("stock")
  const {
    stockData
  } = useHoldingData()

  return (
    <Card.Root variant="glow" className="relative flex flex-col gap-2 h-full">
      <Card.Header>
        <Card.Title className="text-xl">Portfolio</Card.Title>
        <Card.Action>
          <RefreshPricesButton />
        </Card.Action>
      </Card.Header>
      <Card.Content className="h-full flex flex-col gap-4">
        <div className="flex w-full">
          <TabSwitcher
            variant="content"
            value={category}
            onValueChange={(value) => setCategory(value as "stock" | "crypto")}
            options={[
              {
                label: "Stocks",
                value: "stock",
              },
              {
                label: "Crypto",
                value: "crypto",
              },
            ]}
            tabClassName="w-full"
            triggerClassName="h-10 data-[state=active]:after:opacity-0 data-[state=active]:bg-none hover:bg-none"
          />
        </div>
          <div className="flex-1 overflow-hidden w-full">
            <ScrollArea className="h-full w-full">
            <div className="flex flex-col pb-4">
              <Card.Root className="border-0 py-0 gap-1">
                <Card.Content className="flex flex-col px-0 gap-2">
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
                          ? (stock.market_value * 0.99873 / stock.cost_basis - 1) * 100
                          : 0
                        }
                        pnlNet={stock.market_value - stock.cost_basis - stock.market_value * 0.00127}
                        price={stock.price}
                        type="stock"
                      />
                    ))
                  ) : (
                    <span className="self-center py-20 text-muted-foreground">
                      No stock holdings.
                    </span>
                  )}
                </Card.Content>
              </Card.Root>
            </div>
          </ScrollArea>
        </div>
      </Card.Content>
    </Card.Root>
  )
}
