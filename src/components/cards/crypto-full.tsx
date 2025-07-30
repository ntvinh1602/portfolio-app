"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import { formatNum } from "@/lib/utils"
import { CryptoHolding } from "@/hooks/useHoldings"

interface CryptoCardFullProps {
  cryptoHoldings: (CryptoHolding & { total_amount: number })[]
}

export function CryptoCardFull({ cryptoHoldings }: CryptoCardFullProps) {
  const loading = !cryptoHoldings

  return (
    <Card className="gap-3 py-0 border-0">
      <CardHeader className="px-0">
        <CardTitle>Crypto</CardTitle>
        <CardDescription>Digital, decentralized, distributed</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-col gap-1 text-muted-foreground font-thin">
          {loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <SecuritySkeleton key={index} />
            ))
          ) : cryptoHoldings.length > 0 ? (
            cryptoHoldings.map((crypto) => (
              <SecurityItem
                key={crypto.ticker}
                ticker={crypto.ticker}
                name={crypto.name}
                logoUrl={crypto.logo_url}
                quantity={formatNum(crypto.quantity, 2)}
                totalAmount={formatNum(crypto.total_amount)}
                pnl={crypto.cost_basis > 0 ? formatNum(((crypto.total_amount / crypto.cost_basis) - 1) * 100, 1) : "0.0"}
                price={formatNum(crypto.latest_price, 2)}
                priceStatus="success"
                variant="full"
                type="crypto"
              />
            ))
          ) : (
            <div className="text-center font-thin py-4">
              No crypto holdings found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}