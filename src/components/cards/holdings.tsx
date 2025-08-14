import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import { formatNum, compactNum } from "@/lib/utils"
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
  stockHoldings: (Holding & { total_amount: number })[]
  cryptoHoldings: (CryptoHolding & { total_amount: number })[]
}

function HoldingsCompact({ stockHoldings, cryptoHoldings }: HoldingsCompactProps) {
  const router = useRouter()

  const handleNavigation = () => {
    router.push("/holdings")
  }

  return (
    <div className="px-6">
      <Card className="gap-1 py-0 border-0">
        <CardHeader className="px-0">
          <CardDescription
            className="flex items-center gap-1 w-fit"
            onClick={handleNavigation}
          >
            Holdings<ChevronRight className="size-4"/>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
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
                      totalAmount={formatNum(stock.total_amount)}
                      pnlPct={formatNum((stock.total_amount / stock.cost_basis - 1) * 100, 1)}
                      pnlNet={compactNum(stock.total_amount - stock.cost_basis)}
                      variant="compact"
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
                      totalAmount={formatNum(crypto.total_amount)}
                      quantity={formatNum(crypto.quantity, 2)}
                      pnlPct={formatNum((crypto.total_amount / crypto.cost_basis - 1) * 100, 1)}
                      pnlNet={compactNum(crypto.total_amount - crypto.cost_basis)}
                      variant="compact"
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
    </div>
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