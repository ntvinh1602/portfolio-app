import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { ArrowLeftRight } from "lucide-react"

interface CashflowProps {
  net: number
  children: React.ReactNode
}

const cashflowHeader = (net: number) => (
  <CardHeader>
    <CardDescription>Net Cashflow</CardDescription>
    <CardTitle className="text-base sm:text-xl">
      {formatNum(Math.abs(net))}
    </CardTitle>
    <CardAction>
      <ArrowLeftRight className="stroke-1" />
    </CardAction>
  </CardHeader>
)

export function Cashflow({ net, children }: CashflowProps) {
  return (
    <Card>
      {cashflowHeader(net)}
      <CardContent>{children}</CardContent>
    </Card>
  )
}
