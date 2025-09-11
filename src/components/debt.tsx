import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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
    <Card className="gap-2 bg-accent">
      <CardHeader className="gap-0">
        <CardDescription>{name}</CardDescription>
        <CardTitle className="text-2xl text-accent-foreground">
          {amount.toLocaleString()}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Badge variant="default">{interestRate.toFixed(1)}%</Badge>
          <CardDescription className="text-xs">Interest Rate</CardDescription>
        </CardAction>
      </CardHeader>
      <CardContent className="flex justify-between">
        <div className="flex flex-col">
          <CardDescription className="text-xs">Start Date</CardDescription>
          <CardTitle className="font-thin text-sm">
            {startDate}
          </CardTitle>
        </div>
        <div className="flex flex-col text-right">
          <CardDescription className="text-xs">Accrued Interest</CardDescription>
          <CardTitle className="font-thin text-sm">
            {accruedInterest.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </CardTitle>
        </div>
      </CardContent>
    </Card>
  )
}

export function DebtItemSkeleton() {
  return (
    <Card className="gap-2">
      <CardHeader className="px-6">
        <CardDescription>
          <Skeleton className="h-4 w-3/4" />
        </CardDescription>
        <CardTitle className="text-2xl text-accent-foreground">
          <Skeleton className="h-8 w-1/2" />
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Skeleton className="h-4 w-12" />
          <CardDescription className="text-xs">Interest Rate</CardDescription>
        </CardAction>
      </CardHeader>
      <CardContent className="flex justify-between">
        <div className="flex flex-col">
          <CardDescription className="text-xs">Start Date</CardDescription>
          <CardTitle className="font-thin text-sm">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
        </div>
        <div className="flex flex-col text-right justify-end">
          <CardDescription className="text-xs">Accrued Interest</CardDescription>
          <CardTitle className="font-thin text-sm flex justify-end">
            <Skeleton className="h-4 w-20" />
          </CardTitle>
        </div>
      </CardContent>
    </Card>
  )
}
