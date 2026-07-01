"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DnseHoldingItem } from "@/lib/dnse/types"

interface Props {
  holdings: DnseHoldingItem[]
}

export function DnseHoldingsList({ holdings }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Holdings</CardTitle>
        <CardDescription>
          Open stock positions on the selected DNSE sub-account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            This account has no open stock positions right now.
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((holding) => (
              <div
                key={holding.id}
                className="rounded-3xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{holding.symbol}</h3>
                      <Badge variant="outline">{holding.status}</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <HoldingField label="Quantity" value={holding.quantity} />
                      <HoldingField
                        label="Average Price"
                        value={holding.averagePrice}
                      />
                      <HoldingField
                        label="Market Price"
                        value={holding.marketPrice}
                      />
                    </div>
                  </div>

                  <div className="grid min-w-56 gap-3 sm:grid-cols-2">
                    <HoldingField label="Market Value" value={holding.marketValue} />
                    <HoldingField
                      label="Unrealized P/L"
                      value={holding.pnl}
                      tone={holding.pnlTone}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HoldingField({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: DnseHoldingItem["pnlTone"]
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-sm font-medium", resolveTone(tone))}>{value}</p>
    </div>
  )
}

function resolveTone(tone?: DnseHoldingItem["pnlTone"]) {
  if (tone === "positive") {
    return "text-emerald-500"
  }

  if (tone === "negative") {
    return "text-red-500"
  }

  return "text-foreground"
}
