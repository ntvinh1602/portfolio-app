"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { YearSelect } from "@/components/year-select"
import { MonthlyChart } from "./components/monthly-chart"
import { ExpenseChart } from "./components/expense-chart"
import { StockLeaderboard } from "./components/stock-leaderboard"
import { Trophy } from "lucide-react"
import * as Card from "@/components/ui/card"
import { Cashflow } from "./components/cashflow"
import { Return } from "./components/return"

export default function Page() {
  const [year, setYear] = useState(new Date().getFullYear().toString())

  return (
    <div className="flex flex-col pb-4">
      <Header title="Reports" />

      <div className="flex w-full gap-6 px-0">
        <div className="w-48 shrink-0">
          <YearSelect value={year} onChange={setYear} startYear={2022} />
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="grid grid-cols-10 gap-6">
            <div className="flex flex-col col-span-6 gap-2">
              <MonthlyChart year={year} />
              <div className="grid grid-cols-3 gap-2">
                <ExpenseChart year={year} />
                <Cashflow year={year} />
                <Return year={year} />
              </div>
            </div>

            <div className="flex flex-col col-span-4 gap-2">
              <Card.Root variant="glow" className="col-span-4 h-full">
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
      </div>
    </div>
  )
}
