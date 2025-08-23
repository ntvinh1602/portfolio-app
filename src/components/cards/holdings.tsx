import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Holding, CryptoHolding } from "@/hooks/useDashboardData"

interface HoldingsCompactProps {
  variant: "full" | "compact"
  stockHoldings: (Holding & { total_amount: number })[]
  cryptoHoldings: (CryptoHolding & { total_amount: number })[]
}

function HoldingsCompact({ variant, stockHoldings, cryptoHoldings }: HoldingsCompactProps) {
  const router = useRouter()

  const handleNavigation = () => {
    router.push("/holdings")
  }

  return (
    <Card className="gap-1 py-0 border-0">
      <CardHeader className="px-6 md:px-0">
        <CardDescription
          className="flex items-center w-fit"
          onClick={handleNavigation}
        >
          Current Holdings<ChevronRight className="size-4"/>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 md:px-0">
        <div className="flex flex-col gap-1">
          {stockHoldings.length > 0 || cryptoHoldings.length > 0 ? (
            <>
              {stockHoldings
                .sort((a, b) => b.total_amount - a.total_amount)
                .map((stock) => (
                  <SecurityItem
                    key={stock.ticker}
                    ticker={stock.ticker}
                    name={stock.name}
                    logoUrl={stock.logo_url}
                    quantity={stock.quantity}
                    totalAmount={stock.total_amount}
                    pnlPct={(stock.total_amount / stock.cost_basis - 1) * 100}
                    pnlNet={stock.total_amount - stock.cost_basis}
                    price={stock.latest_price / 1000}
                    variant={variant}
                    type="stock"
                  />
              ))}
              {cryptoHoldings
                .sort((a, b) => b.total_amount - a.total_amount)
                .map((crypto) => (
                  <SecurityItem
                    key={crypto.ticker}
                    ticker={crypto.ticker}
                    name={crypto.name}
                    logoUrl={crypto.logo_url}
                    totalAmount={crypto.total_amount}
                    quantity={crypto.quantity}
                    pnlPct={(crypto.total_amount / crypto.cost_basis - 1) * 100}
                    pnlNet={crypto.total_amount - crypto.cost_basis}
                    price={crypto.latest_price}
                    variant={variant}
                    type="crypto"
                  />
              ))}
            </>
          ) : (
            <div className="text-center text-sm font-thin text-muted-foreground py-4">
              No holdings found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function HoldingsCompactSkeleton() {
  return (
    <div className="px-6">
      <Card className="gap-1 py-0 border-0">
        <CardHeader className="px-0">
          <CardDescription className="flex items-center gap-1 w-fit">
            Holdings<ChevronRight className="size-4"/>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <SecuritySkeleton variant="compact" key={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export {
  HoldingsCompact,
  HoldingsCompactSkeleton
}