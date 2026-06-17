"use client"

import { Separator } from "@/components/ui/separator"
import { BSItem } from "./bs-item"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"
import { Card } from "@/components/ui/card"

export default function Page() {
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

  return (
    <div className="flex flex-col gap-6">
      <Separator />
      <Card
        className="
          w-6/10 mx-auto p-6
          backdrop-blur-sm
          shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)]
          before:content-[''] before:absolute before:top-0 before:left-0
          before:w-full before:h-px
          before:bg-gradient-to-r
          before:from-transparent before:via-ring/40 before:to-transparent
        "
      >
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* ASSETS COLUMN */}
          <div className="flex-1">
            <h2 className="text-lg font-normal text-center mb-4">
              Total Assets
            </h2>

            <BSItem header label="Assets" value={totalAssets} />

            {Object.entries(groupedAssets).map(([assetClass, items]) => {
              const totalValue = items.reduce(
                (sum, i) => sum + (i.total_value ?? 0),
                0
              )

              return (
                <BSItem
                  key={assetClass}
                  label={assetClass}
                  value={totalValue}
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

          {/* VERTICAL DIVIDER */}
          <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-ring/70 to-transparent" />

          {/* LIABILITIES + EQUITY COLUMN */}
          <div className="flex-1">
            <h2 className="text-lg font-normal text-center mb-4">
              Total Liabilities
            </h2>

            <BSItem header label="Liabilities" value={totalLiabilities} />

            {liabilities.map((item) => (
              <BSItem
                key={item.ticker}
                label={item.name}
                value={item.total_value}
              />
            ))}

            <div className="my-4" />

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
    </div>
  )
}
