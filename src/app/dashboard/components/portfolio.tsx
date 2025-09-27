import { useState } from "react"
import * as Card from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLiveData } from "@/app/dashboard/context/live-data-context"
import {
  LiveIndicator,
  RefreshPricesButton,
  Asset,
  AssetSkeleton
} from "./portfolio-card"
import { TabSwitcher } from "@/components/tab-switcher"
import { RefreshCw } from "lucide-react"

export function Portfolio() {
  const [category, setCategory] = useState<"stock" | "crypto">("stock")
  const {
    processedCryptoData,
    processedStockData,
    isCryptoPriceLive,
    isStockPriceLive,
    isLoading,
  } = useLiveData()
  
  if (isLoading) {
    return (
      <Card.Root className="gap-2 h-full flex flex-col">
        <Card.Header>
          <Card.Title className="text-xl">Portfolio</Card.Title>
          <Card.Action>
            <RefreshCw className="size-4 mx-4 m-2 text-muted-foreground animate-spin"/>
          </Card.Action>
        </Card.Header>
        <Card.Content className="h-full flex flex-col items-center gap-3">
          <TabSwitcher
            variant="content"
            value={category}
            onValueChange={(value) => setCategory(value as "stock" | "crypto")}
            options={[
              {
                label: "Stocks",
                value: "stock",
                customBadge: <div className="size-2.5 rounded-full bg-rose-700"/>
              },
              {
                label: "Crypto",
                value: "crypto",
                customBadge: <div className="size-2.5 rounded-full bg-rose-700"/>
              },
            ]}
            tabClassName="w-full"
            triggerClassName="text-sm font-light h-10"
          />
          <div className="flex flex-col gap-2 w-full">
            {[...Array(3)].map((_, i) => (<AssetSkeleton key={i}/>))}
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  return (
    <Card.Root className="h-full flex flex-col gap-2">
      <Card.Header>
        <Card.Title className="text-xl">Portfolio</Card.Title>
        <Card.Action>
          <RefreshPricesButton />
        </Card.Action>
      </Card.Header>
      <Card.Content className="h-full flex flex-col gap-3">
        <TabSwitcher
          variant="content"
          value={category}
          onValueChange={(value) => setCategory(value as "stock" | "crypto")}
          options={[
            {
              label: "Stocks",
              value: "stock",
              customBadge: <LiveIndicator is247={false} source={isStockPriceLive}/>
            },
            {
              label: "Crypto",
              value: "crypto",
              customBadge: <LiveIndicator is247={true} source={isCryptoPriceLive}/>
            },
          ]}
          tabClassName="w-full"
          triggerClassName="text-sm font-light h-10"
        />
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col pb-4">
              {category === "stock" ? (
                <Card.Root className="border-0 py-0 gap-1">
                  <Card.Content className="flex flex-col px-0 gap-1">
                    {processedStockData.length > 0 ? (
                      processedStockData.map((stock) => (
                        <Asset
                          key={stock.ticker}
                          ticker={stock.ticker}
                          name={stock.name}
                          logoUrl={stock.logo_url}
                          quantity={stock.quantity}
                          totalAmount={stock.totalAmount}
                          pnlPct={stock.pnlPct}
                          pnlNet={stock.pnlNet}
                          price={stock.price}
                          prevPrice={stock.prevPrice}
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
              ) : (
                <Card.Root className="border-0 py-0 gap-1">
                  <Card.Content className="flex flex-col px-0 gap-1">
                    {processedCryptoData.length > 0 ? (
                      processedCryptoData.map((crypto) => (
                        <Asset
                          key={crypto.ticker}
                          ticker={crypto.ticker}
                          name={crypto.name}
                          logoUrl={crypto.logo_url}
                          quantity={crypto.quantity}
                          totalAmount={crypto.totalAmount}
                          pnlPct={crypto.pnlPct}
                          pnlNet={crypto.pnlNet}
                          price={crypto.price}
                          prevPrice={crypto.prevPrice}
                          type="crypto"
                        />
                      ))
                    ) : (
                      <span className="self-center py-20 text-muted-foreground">
                        No crypto holdings.
                      </span>
                    )}
                  </Card.Content>
                </Card.Root>
              )}
            </div>
          </ScrollArea>
        </div>
      </Card.Content>
    </Card.Root>
  )
}
