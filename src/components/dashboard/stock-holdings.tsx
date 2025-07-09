import { StockCardLite, StockSkeleton } from "@/components/stock/stock-layout"
import { formatNum } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

export function HoldingsCard() {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/assets/holdings")
  }
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([])
  const [loading, setLoading] = useState(true)

  interface StockHoldingBase {
    ticker: string;
    name: string;
    logo_url: string;
    quantity: number;
    cost_basis: number;
    latest_price: number;
  }

  interface StockHolding extends StockHoldingBase {
    total_amount: number;
  }

  useEffect(() => {
    async function fetchInitialData() {
      const { data, error } = await supabase.rpc('get_stock_holdings');
      if (error) {
        console.error('Error fetching stock holdings:', error);
      } else if (data) {
        const holdingsWithTotalAmount: StockHolding[] = (data as StockHoldingBase[]).map((holding: StockHoldingBase) => ({
          ...holding,
          total_amount: holding.quantity * holding.latest_price,
        }));
        setStockHoldings(holdingsWithTotalAmount);
      }
      setLoading(false)
    }

    fetchInitialData();
  }, [])

  return (
    <div className="px-6">
      <Card className="bg-muted/50 shadow-none gap-0 pb-0">
        <CardHeader className="px-4">
        <CardDescription
          className="flex items-center gap-1"
          onClick={handleNavigation}
        >
          Stocks<ChevronRight className="size-4"/>
        </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="flex flex-col">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <StockSkeleton key={index} />
              ))
            ) : stockHoldings.length > 0 ? (
              stockHoldings.map((stock) => (
                <StockCardLite
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                  logoUrl={stock.logo_url}
                  totalAmount={formatNum(stock.total_amount)}
                  pnl={formatNum((stock.total_amount / stock.cost_basis - 1) * 100, undefined, 1)}
                  price=""
                  quantity=""
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