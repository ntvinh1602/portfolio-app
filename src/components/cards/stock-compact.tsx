import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import { formatNum } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Holding } from "@/hooks/useHoldings"

interface StockCardCompactProps {
  stockHoldings: (Holding & { total_amount: number })[]
}

function StockCardCompact({ stockHoldings }: StockCardCompactProps) {
  const router = useRouter()
  const loading = !stockHoldings

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
            Stocks<ChevronRight className="size-4"/>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-col">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <SecuritySkeleton variant="compact" key={index} />
              ))
            ) : stockHoldings.length > 0 ? (
              stockHoldings.map((stock) => (
                <SecurityItem
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                  logoUrl={stock.logo_url}
                  totalAmount={formatNum(stock.total_amount)}
                  pnl={formatNum((stock.total_amount / stock.cost_basis - 1) * 100, 1)}
                  variant="compact"
                  type="stock"
                />
              ))
            ) : (
              <div className="text-center text-sm font-thin text-muted-foreground py-4">
                No stock holdings found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StockCardCompactSkeleton() {
  return (
    <div className="px-6">
      <Card className="gap-0 pb-0">
        <CardHeader className="px-4">
          <CardDescription className="flex items-center gap-1 w-fit">
            Stocks<ChevronRight className="size-4"/>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="flex flex-col">
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
  StockCardCompact,
  StockCardCompactSkeleton
}