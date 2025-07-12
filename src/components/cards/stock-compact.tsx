import {
  StockItem,
  StockSkeleton
} from "@/components/primitives/stock-item"
import { formatNum } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useStockHoldings } from "@/hooks/useStockHoldings"

export function StockCardCompact() {
  const router = useRouter()
  const { stockHoldings, loading } = useStockHoldings()

  const handleNavigation = () => {
    router.push("/assets/holdings")
  }

  return (
    <div className="px-6">
      <Card className="bg-muted/50 shadow-none gap-0 pb-0">
        <CardHeader className="px-4">
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          Stocks<ChevronRight className="size-4"/>
        </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="flex flex-col">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <StockSkeleton variant="compact" key={index} />
              ))
            ) : stockHoldings.length > 0 ? (
              stockHoldings.map((stock) => (
                <StockItem
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                  logoUrl={stock.logo_url}
                  totalAmount={formatNum(stock.total_amount)}
                  pnl={formatNum((stock.total_amount / stock.cost_basis - 1) * 100, undefined, 1)}
                  variant="compact"
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No stock holdings found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}