import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Trophy } from "lucide-react"

const topStocksHeader = (
  <CardHeader>
    <CardTitle>Best Performers</CardTitle>
    <CardDescription>Based on total realized P/L</CardDescription>
    <CardAction>
      <Trophy className="stroke-1" />
    </CardAction>
  </CardHeader>
)

export function TopStocks({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      {topStocksHeader}
      <CardContent>{children}</CardContent>
    </Card>
  )
}
