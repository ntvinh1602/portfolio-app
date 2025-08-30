import { SecurityItem, SecuritySkeleton } from "@/components/list-item/security"
import { CryptoData } from "@/types/dashboard-data"

interface CryptoHoldingsProps {
  variant?: "compact" | "full"
  data: CryptoData[] | null
  liveBtcPrice: string | null
}

export function CryptoHoldings({ variant = "full", data, liveBtcPrice }: CryptoHoldingsProps) {

  return (
    <div className="flex flex-col gap-1 text-muted-foreground">
      {variant === "full" && <span className="text-sm px-2 font-light">Crypto</span>}
      {!data ? (
        Array.from({ length: 2 }).map((_, index) => (
          <SecuritySkeleton key={index} />
        ))
      ) : data.length > 0 ? (
        data.map((crypto) => {
          const isBTC = crypto.ticker === "BTC"
          const livePrice = isBTC && liveBtcPrice 
            ? parseFloat(liveBtcPrice)
            : crypto.latest_price
          const liveTotalAmount = isBTC && liveBtcPrice
            ? crypto.quantity * parseFloat(liveBtcPrice) * crypto.latest_usd_rate
            : crypto.total_amount

          return (
            <SecurityItem
              key={crypto.ticker}
              ticker={crypto.ticker}
              name={crypto.name}
              logoUrl={crypto.logo_url}
              quantity={crypto.quantity}
              totalAmount={liveTotalAmount}
              pnlPct={crypto.cost_basis > 0
                ? (liveTotalAmount / crypto.cost_basis - 1) * 100
                : 0
              }
              pnlNet={liveTotalAmount - crypto.cost_basis}
              price={livePrice}
              variant={variant}
              type="crypto"
            />
          )
        })
      ) : (
        <div className="text-center py-4">No crypto holdings found.</div>
      )}
    </div>
  )
}