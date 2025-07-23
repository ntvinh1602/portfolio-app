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
import { CryptoHolding } from "@/hooks/useHoldings"

interface CryptoCardCompactProps {
  cryptoHoldings: (CryptoHolding & { total_amount: number })[]
}

function CryptoCardCompact({ cryptoHoldings }: CryptoCardCompactProps) {
  const router = useRouter()
  const loading = !cryptoHoldings

  const handleNavigation = () => {
    router.push("/holdings")
  }

  return (
    <div className="px-6">
      <Card className="gap-0 pb-0">
        <CardHeader className="px-4">
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          Crypto<ChevronRight className="size-4"/>
        </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="flex flex-col">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <SecuritySkeleton variant="compact" key={index} />
              ))
            ) : cryptoHoldings.length > 0 ? (
              cryptoHoldings.map((crypto) => (
                <SecurityItem
                  key={crypto.ticker}
                  ticker={crypto.ticker}
                  name={crypto.name}
                  logoUrl={crypto.logo_url}
                  totalAmount={formatNum(crypto.total_amount)}
                  quantity={formatNum(crypto.quantity, 2)}
                  pnl={formatNum((crypto.total_amount / crypto.cost_basis - 1) * 100, 1)}
                  variant="compact"
                  type="crypto"
                />
              ))
            ) : (
              <div className="text-center text-sm font-thin text-muted-foreground py-4">
                No crypto holdings found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CryptoCardCompactSkeleton() {
  return (
    <div className="px-6">
      <Card className="gap-0 pb-0">
        <CardHeader className="px-4">
          <CardDescription className="flex items-center gap-1 w-fit">
            Crypto<ChevronRight className="size-4"/>
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
  CryptoCardCompact,
  CryptoCardCompactSkeleton
}