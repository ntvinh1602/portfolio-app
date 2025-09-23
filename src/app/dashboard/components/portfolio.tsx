import { Loading } from "@/components/loader"
import * as Card from "@/components/ui/card"
import { useLiveData } from "@/app/dashboard/context/live-data-context"
import {
  LiveIndicator,
  RefreshPricesButton,
  Asset
} from "./portfolio-card"

export function Portfolio() {
  const {
    processedCryptoData,
    processedStockData,
    isCryptoPriceLive,
    isStockPriceLive,
    loading
  } = useLiveData()
  
  if (loading) return (
    <Card.Root className="gap-2 h-full">
      <Card.Header>
        <Card.Title className="text-xl">Portfolio</Card.Title>
        <Card.Action>
          <RefreshPricesButton/>
        </Card.Action>
      </Card.Header>
      <Card.Content className="h-full">
        <Loading/>
      </Card.Content>
    </Card.Root>
  )

  return (
    <Card.Root className="gap-2 h-full">
      <Card.Header>
        <Card.Title className="text-xl">Portfolio</Card.Title>
        <Card.Action>
          <RefreshPricesButton/>
        </Card.Action>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4 md:gap-6 px-2 md:px-4">
        <Card.Root className="border-0 py-0 gap-1">
          <Card.Header className="flex justify-between items-center px-0">
            <Card.Subtitle className="px-2">Stocks</Card.Subtitle>
            <LiveIndicator is247={false} source={isStockPriceLive}/>
          </Card.Header>
          <Card.Content className="flex flex-col px-0 gap-1">
            {processedStockData.length > 0 ?
              processedStockData.map((stock) => {
                return (
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
              )})
              : <span className="self-center py-20">No stock holdings.</span>}
          </Card.Content>
        </Card.Root>
        
        <Card.Root className="border-0 py-0 gap-1">
          <Card.Header className="flex justify-between items-center px-0">
            <Card.Subtitle className="px-2">Crypto</Card.Subtitle>
            <LiveIndicator is247={true} source={isCryptoPriceLive}/>
          </Card.Header>
          <Card.Content className="flex flex-col px-0 gap-1">
            {processedCryptoData.length > 0 ?
              processedCryptoData.map((crypto) => {
                return (
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
              )})
              : <span className="self-center py-20">No crypto holdings.</span>}
          </Card.Content>
        </Card.Root>
      </Card.Content>
    </Card.Root>
  )
}