import { Loading } from "@/components/loader"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { useAssetData } from "@/context/asset-data-context"
import Image from 'next/image'
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Coins,
} from "lucide-react"
import { formatNum, compactNum } from "@/lib/utils"
import { LiveIndicator } from "./live-indicator"

function Security({
  ticker,
  name,
  logoUrl,
  totalAmount,
  quantity,
  pnlPct,
  pnlNet,
  price,
  type
}: {
  ticker: string
  name: string
  logoUrl: string
  totalAmount: number
  pnlPct: number
  pnlNet: number
  quantity?: number
  price?: number
  type: 'stock' | 'crypto'
}) {

  return (
    <Card className="border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl py-3">
      <CardContent className="flex items-center gap-3 px-3">
        <Image
          src={logoUrl}
          alt={name}
          width={56}
          height={56}
          className="rounded-full bg-background"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[180px]">
            <CardTitle>{ticker}</CardTitle>
            <CardDescription className="text-xs truncate">
              {name}
            </CardDescription>
            {<CardDescription className="flex items-center gap-1 truncate pt-1">
                <Badge variant="outline" className="font-thin text-foreground">
                  <Leaf />
                  {quantity
                    ? type === 'stock'
                      ? <>{formatNum(quantity)}</>
                      : <>{formatNum(
                          quantity,
                          ticker === "BTC" ? 8 : 2
                        )}</>
                    : 0
                  }
                </Badge>
                <Badge variant="outline" className="font-thin text-foreground">
                  <Coins />
                  {price
                    ? type === 'stock'
                      ? formatNum(price, 2)
                      : formatNum(price)
                    : 0
                  }
                </Badge>
              </CardDescription>}
          </div>
          <div className="flex flex-col justify-end pr-2">
            <CardTitle className="text-right text-sm">
              {formatNum(totalAmount)}
            </CardTitle>
            <CardDescription className="flex items-center justify-end text-xs gap-1">
              <div className="[&_svg]:size-4 [&_svg]:stroke-2 flex gap-1">
                {pnlNet !== null && pnlNet < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                {compactNum(Math.abs(pnlNet))}
                {` (${formatNum(Math.abs(pnlPct), 1)}%)`}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Portfolio() {
  const {
    processedCryptoData,
    processedStockData,
    isCryptoPriceLive,
    isStockPriceLive,
    loading
  } = useAssetData()
  
  if (loading) return <Loading/>

  return (
    <Card className="gap-2 h-full">
      <CardHeader>
        <CardTitle className="text-xl">Portfolio</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:gap-6 px-2 md:px-4">
        <Card className="border-0 py-0 gap-1 md:gap-2">
          <CardHeader className="flex justify-between px-0">
            <CardDescription className="px-2">Stocks</CardDescription>
            <LiveIndicator is247={false} source={isStockPriceLive}/>
          </CardHeader>
          <CardContent className="flex flex-col px-0 gap-1">
            {processedStockData.length > 0 ?
              processedStockData.map((stock) => {
                return (
                  <Security
                    key={stock.ticker}
                    ticker={stock.ticker}
                    name={stock.name}
                    logoUrl={stock.logo_url}
                    quantity={stock.quantity}
                    totalAmount={stock.totalAmount}
                    pnlPct={stock.pnlPct}
                    pnlNet={stock.pnlNet}
                    price={stock.price}
                    type="stock"
                  />
              )})
              : <span className="self-center py-20">No stock holdings.</span>}
          </CardContent>
        </Card>
        
        <Card className="border-0 py-0 gap-1 md:gap-2">
          <CardHeader className="flex justify-between px-0">
            <CardDescription className="px-2">Crypto</CardDescription>
            <LiveIndicator is247={true} source={isCryptoPriceLive}/>
          </CardHeader>
          <CardContent className="flex flex-col px-0 gap-1">
            {processedCryptoData.length > 0 ?
              processedCryptoData.map((crypto) => {
                return (
                  <Security
                    key={crypto.ticker}
                    ticker={crypto.ticker}
                    name={crypto.name}
                    logoUrl={crypto.logo_url}
                    quantity={crypto.quantity}
                    totalAmount={crypto.totalAmount}
                    pnlPct={crypto.pnlPct}
                    pnlNet={crypto.pnlNet}
                    price={crypto.price}
                    type="crypto"
                  />
              )})
              : <span className="self-center py-20">No crypto holdings.</span>}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}