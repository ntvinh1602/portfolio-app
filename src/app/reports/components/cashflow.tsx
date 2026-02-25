"use client"

import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { compactNum } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle
} from "lucide-react"

interface CashflowProps {
  deposits: number
  withdrawals: number
  className?: string
}

export function Cashflow({
  deposits,
  withdrawals,
  className
}: CashflowProps) {

  const inflow = deposits ?? 0
  const outflow = Math.abs(withdrawals ?? 0)
  const net = inflow + withdrawals
  const isNegative = net < 0

  return (
    <Card
      className={`gap-6 h-fit rounded-xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent ${className ?? ""}`}
    >
      <CardHeader>
        <CardTitle className="text-xl font-normal">Cashflow</CardTitle>
        <CardAction>
          <ArrowLeftRight className="size-5 stroke-1" />
        </CardAction>
      </CardHeader>

      <CardContent className="px-6 pb-6 flex flex-col gap-4">
        
        {/* Deposits */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="size-5 stroke-1" />
            <p className="text-muted-foreground">Deposits</p>
          </div>
          <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
            <TrendingUp className="text-green-500" />
            {compactNum(inflow)}
          </div>
        </div>

        {/* Withdrawals */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="size-5 stroke-1" />
            <p className="text-muted-foreground">Withdrawals</p>
          </div>
          <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
            <TrendingDown className="text-red-700" />
            {compactNum(outflow)}
          </div>
        </div>

        {/* Net */}
        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Net Cashflow</p>
            <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
              {isNegative
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {compactNum(Math.abs(net))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}