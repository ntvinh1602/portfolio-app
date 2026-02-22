"use client"

import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { BookCheck } from "lucide-react"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"
import { Card } from "@/components/ui/card"
import { useState } from "react"
import { BSItem } from "./balance-sheet/bs-item"

export function BalanceSheet() {
  const {
    bsData,
    totalAssets,
    totalLiabilities,
    totalEquity,
  } = useBalanceSheetData()

  const assets = bsData.filter(
    (r) => r.asset_class !== "equity" && r.asset_class !== "liability"
  )
  const liabilities = bsData.filter((r) => r.asset_class === "liability")
  const equities = bsData.filter((r) => r.asset_class === "equity")

  const groupedAssets = assets.reduce((acc, item) => {
    const key = item.asset_class
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, typeof assets>)

  const [openGroup, setOpenGroup] = useState<string | null>(null)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <BookCheck className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="rounded-2xl bg-background/80 backdrop-blur-sm w-fit max-h-[80vh] overflow-y-auto"
      >
        <Card className="flex flex-row px-2 py-4 border-0 bg-transparent">
          {/* ASSETS */}
          <div className="flex flex-col min-w-100">
            <BSItem header label="Assets" value={totalAssets} />

            {Object.entries(groupedAssets).map(([assetClass, items]) => {
              const isOpen = openGroup === assetClass
              const totalValue = items.reduce(
                (sum, i) => sum + (i.total_value ?? 0),
                0
              )

              return (
                <BSItem
                  key={assetClass}
                  label={assetClass}
                  value={totalValue}
                  open={isOpen}
                  collapsible
                  onClick={() =>
                    setOpenGroup(isOpen ? null : assetClass)
                  }
                  className={`cursor-pointer hover:bg-muted/40`}
                >
                  {items.map((item) => (
                    <BSItem
                      key={item.ticker}
                      label={item.name}
                      value={item.total_value}
                      className="py-2"
                    />
                  ))}
                </BSItem>
              )
            })}
          </div>

          {/* Divider */}
          <div className="relative flex items-center">
            <div
              className="
                relative w-px h-full rounded-full
                bg-linear-to-b from-transparent via-ring/70 to-transparent
              "
            />
          </div>

          {/* LIABILITIES + EQUITY */}
          <div className="flex flex-col gap-4 min-w-100">
            <div className="flex flex-col">
              <BSItem header label="Liabilities" value={totalLiabilities} />
              {liabilities.map((item) => (
                <BSItem
                  key={item.ticker}
                  label={item.name}
                  value={item.total_value}
                />
              ))}
            </div>

            <div>
              <BSItem header label="Equity" value={totalEquity} />
              {equities.map((item) => (
                <BSItem
                  key={item.ticker}
                  label={item.name}
                  value={item.total_value}
                />
              ))}
            </div>
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
