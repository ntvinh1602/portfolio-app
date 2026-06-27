"use client"

import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Image from "next/image"
import { formatNum, compactNum, cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import RefreshButton from "./refresh-button"
import type { Asset } from "@fund/fund.types"
import StatusLabel from "@/components/status-label"
import { Piechart } from "@/components/charts/piechart"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { assetChart, liabilityChart } from "../../config"

function Asset({
  name,
  logo_url,
  quantity,
  total_value,
  mkt_price,
  net_profit,
}: {
  name: string
  logo_url: string
  quantity: number
  total_value: number
  mkt_price: number
  net_profit: number
}) {
  const isMobile = useIsMobile()
  const pnlPct = (net_profit / total_value) * 100
  const isPositive = net_profit >= 0
  return (
    <Item variant="muted">
      <ItemMedia variant="image">
        {logo_url && (
          <Image
            src={logo_url}
            alt={name}
            width={44}
            height={44}
            unoptimized
            loading="eager"
          />
        )}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="block max-w-[180px] truncate">{name}</ItemTitle>
        <ItemDescription className="text-xs">
          {formatNum(quantity)}
          {" units @ "}
          {formatNum(mkt_price / 1000, 2)}
        </ItemDescription>
      </ItemContent>
      <ItemContent className="items-end">
        <ItemTitle>
          {!isMobile ? formatNum(total_value) : compactNum(total_value)}
        </ItemTitle>
        <ItemDescription
          className={cn(
            "flex items-center gap-1 text-xs",
            isPositive ? "text-primary" : "text-destructive",
          )}
        >
          {!isMobile ? (
            <span>
              {compactNum(net_profit)}
              {" ("}
              {formatNum(pnlPct, 1)}
              {"%)"}
            </span>
          ) : (
            <span>{formatNum(pnlPct, 1)}%</span>
          )}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

interface Props {
  bs: Asset[]
  liability: number
  equity: number
  cash: number
  stock: number
  fund: number
  debt: number
  margin: number
}

export function Portfolio({
  bs,
  liability,
  equity,
  cash,
  stock,
  fund,
  debt,
  margin,
}: Props) {
  const sortedStocks = [...bs]
    .filter((a) => a.asset_class == "stock")
    .sort((a, b) => b.total_value - a.total_value)
  const asset = liability + equity
  const leverage = equity !== 0 ? (liability / equity).toFixed(2) : "∞"

  // --- Asset Chart ---
  const assetChartData = [
    {
      asset: "cash",
      allocation: cash,
    },
    {
      asset: "stock",
      allocation: stock,
    },
    {
      asset: "fund",
      allocation: fund,
    },
  ].filter((d) => d.allocation > 0)

  // --- Liability Chart ---
  const liabilityChartData = [
    {
      liability: "equity",
      allocation: equity,
    },
    {
      liability: "debts",
      allocation: debt,
    },
    {
      liability: "margin",
      allocation: margin,
    },
  ].filter((d) => d.allocation > 0)
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Portfolio</CardTitle>
        <CardAction className="flex gap-3 ">
          <RefreshButton />
          <Button variant="outline" size="icon-sm" asChild>
            <Link href="/fund/dashboard/balance-sheet">
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {sortedStocks.length > 0 ? (
          sortedStocks.map((bs) => (
            <Asset
              key={bs.ticker}
              name={bs.name}
              logo_url={bs.logo_url || ""}
              quantity={bs.quantity}
              total_value={bs.total_value}
              mkt_price={bs.mkt_price || 0}
              net_profit={bs.net_profit || 0}
            />
          ))
        ) : (
          <StatusLabel type="empty" />
        )}
      </CardContent>
      <div className="flex flex-1 gap-2">
        <div className="w-full">
          <CardHeader>
            <CardDescription>Total AUM</CardDescription>
            <CardTitle className="text-base sm:text-xl">
              {formatNum(liability + equity)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Piechart
              data={assetChartData}
              chartConfig={assetChart}
              dataKey="allocation"
              nameKey="asset"
              className="w-full max-h-50"
              innerRadius={65}
              legend="right"
              margin_tb={0}
              valueFormatter={(v) => `${formatNum((v / asset) * 100, 1)}%`}
            />
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div className="w-full">
          <CardHeader>
            <CardDescription>Leverage</CardDescription>
            <CardTitle className="text-base sm:text-xl">{leverage}</CardTitle>
            <CardAction></CardAction>
          </CardHeader>
          <CardContent>
            <Piechart
              data={liabilityChartData}
              chartConfig={liabilityChart}
              dataKey="allocation"
              nameKey="liability"
              className="w-full max-h-50"
              innerRadius={65}
              legend="right"
              margin_tb={0}
              valueFormatter={(v) => `${formatNum((v / asset) * 100, 1)}%`}
            />
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
