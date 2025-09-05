import { SecurityItem, SecuritySkeleton } from "@/components/list-item/security"
import { useAssetData } from "@/context/asset-data-context"
import { Loading } from "../loader"

interface CryptoHoldingsProps {
  variant?: "compact" | "full"
}

export function CryptoHoldings({ variant = "full" }: CryptoHoldingsProps) {
  const { processedCryptoData, loading } = useAssetData()
    
  if (loading) {
    return (
      <Loading/>
    )
  }

  return (
    <div className="flex flex-col gap-1 text-muted-foreground">
      {processedCryptoData.length > 0 ? (
        processedCryptoData.map((crypto) => {
          return (
            <SecurityItem
              key={crypto.ticker}
              ticker={crypto.ticker}
              name={crypto.name}
              logoUrl={crypto.logo_url}
              quantity={crypto.quantity}
              totalAmount={crypto.totalAmount}
              pnlPct={crypto.pnlPct}
              pnlNet={crypto.pnlNet}
              price={crypto.price}
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