"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Separator } from "@/components/ui/separator"
import { YearSelect } from "@/components/year-select"
import { MonthlyChart } from "./components/monthly-chart"
import { ExpenseChart } from "./components/expense-chart"
import { StockLeaderboard } from "./components/stock-leaderboard"
import { Trophy } from "lucide-react"
import * as Card from "@/components/ui/card"
import { Cashflow } from "./components/cashflow"

export default function Page() {
  const [year, setYear] = useState("2025")

  return (
    <div className="flex flex-col pb-4">
      <Header title="Reports" />
      <Separator className="mb-2" />

      <div className="flex flex-col w-7/10 gap-2 mx-auto">
        {/* Year selector controls the entire report year */}
        <YearSelect value={year} onChange={setYear} startYear={2022} />

        <div className="grid grid-cols-10 gap-6">
          {/* Left column — charts */}
          <div className="flex flex-col col-span-6 gap-2">
            <MonthlyChart year={year} />
            <div className="grid grid-cols-2 gap-4">
              <ExpenseChart year={year} className="rounded-2xl backdrop-blur-sm shadow-[0_0_20px_rgba(255,0,100,0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-rose-400/40 before:to-transparent before:rounded-t-2xl"/>
              <Cashflow year={year} className="rounded-2xl backdrop-blur-sm shadow-[0_0_20px_rgba(255,0,100,0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-rose-400/40 before:to-transparent before:rounded-t-2xl"/>
            </div>
          </div>

          {/* Right column — stock leaderboard */}
          <Card.Root className="col-span-4 h-full rounded-2xl backdrop-blur-sm shadow-[0_0_20px_rgba(255,0,100,0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-rose-400/40 before:to-transparent before:rounded-t-2xl">
            <Card.Header>
              <Card.Title className="text-xl">Best Performers</Card.Title>
              <Card.Subtitle>
                Based on total realized P/L
              </Card.Subtitle>
              <Card.Action>
                <Trophy className="stroke-1 size-5"/>
              </Card.Action>
            </Card.Header>
            <Card.Content>
              <StockLeaderboard year={year} />
            </Card.Content>
          </Card.Root>
        </div>
      </div>
    </div>
  )
}
