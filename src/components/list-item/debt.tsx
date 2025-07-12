import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface DebtItemProps {
  name: string
  amount: number
  interestRate: number
  startDate: string
  accruedInterest: number
}

export function DebtItem(
  { name, amount, interestRate, startDate, accruedInterest }: DebtItemProps,
) {
  return (
    <Card className="bg-muted/50 shadow-none gap-2">
      <CardHeader className="px-6">
        <CardDescription>{name}</CardDescription>
        <CardTitle className="text-2xl">
          {amount.toLocaleString()}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Badge variant="outline">
            {interestRate.toFixed(1)}%
          </Badge>
          <CardDescription className="text-xs">Interest Rate</CardDescription>
        </CardAction>
      </CardHeader>
      <CardContent className="flex justify-between">
        <div className="flex flex-col">
          <CardDescription className="text-xs">Start Date</CardDescription>
          <CardTitle className="font-normal text-sm">
            {startDate}
          </CardTitle>
        </div>
        <div className="flex flex-col text-right">
          <CardDescription className="text-xs">Accrued Interest</CardDescription>
          <CardTitle className="font-normal text-sm">
            {accruedInterest.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </CardTitle>
        </div>
      </CardContent>
    </Card>
  )
}
