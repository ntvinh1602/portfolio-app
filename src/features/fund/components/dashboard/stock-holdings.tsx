"use client"

import {
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { BSheetView } from "@fund/fund.types"
import StatusLabel from "@/components/status-label"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { ButtonGroup } from "@/components/ui/button-group"
import AssetItem from "@fund/components/asset-item"
import { ItemGroup } from "@/components/ui/item"
import { useState } from "react"
import { fetchPrices } from "@fund/actions/fetch-price"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
interface Props {
  bs: BSheetView[]
}

export function StockHoldings({ bs }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Fetching latest prices...")

    try {
      const data = await fetchPrices()

      toast.success(data.message, {
        id: toastId,
        description: `Updated items: ${data.updated}`,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update prices"
      toast.error(message, { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  const sortedStocks = [...bs]
    .filter((a) => a.asset_class == "stock" || a.asset_class == "fund")
    .sort((a, b) => b.total_value - a.total_value)

  return (
    <div className="flex flex-col gap-6 w-full">
      <CardHeader>
        <CardTitle>Portfolio</CardTitle>
        <CardAction>
          <ButtonGroup>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`${isRefreshing && "animate-spin"}`} />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <Link href="/fund/dashboard/balance-sheet">
                B. Sheet
                <ArrowRight />
              </Link>
            </Button>
          </ButtonGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        {sortedStocks.length > 0 ? (
          <ItemGroup className="gap-2">
            {sortedStocks.map((bs) => (
              <AssetItem
                variant="dashboard"
                key={bs.ticker}
                ticker={bs.ticker}
                name={bs.name}
                asset_class={bs.asset_class}
                currency_code={bs.currency_code}
                logo_url={bs.logo_url}
                quantity={bs.quantity}
                total_value={bs.total_value}
                mkt_price={bs.mkt_price}
                net_profit={bs.net_profit}
              />
            ))}
          </ItemGroup>
        ) : (
          <StatusLabel type="empty" />
        )}
      </CardContent>
    </div>
  )
}
