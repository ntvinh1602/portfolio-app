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

export default function Page() {
  const [year, setYear] = useState("2025")

  return (
    <div className="flex flex-col pb-4">
      <Header title="Reports" />
      <Separator className="mb-2" />

      <div className="flex flex-col w-7/10 gap-2 mx-auto">
        {/* Year selector controls the entire report year */}
        <YearSelect value={year} onChange={setYear} startYear={2022} />

        <div className="grid grid-cols-10 gap-2">
          {/* Left column — charts */}
          <div className="flex flex-col col-span-6 gap-2">
            <MonthlyChart year={year} />
            <ExpenseChart year={year} />
          </div>

          {/* Right column — stock leaderboard */}
          <Card.Root className="col-span-4">
            <Card.Header>
              <Card.Title>Top Performers</Card.Title>
              <Card.Subtitle>
                By total realized P/L of the year
              </Card.Subtitle>
              <Card.Action>
                <Trophy className="stroke-1 size-5"/>
              </Card.Action>
            </Card.Header>
            <Card.Content>
              <StockLeaderboard year={Number(year)} />
            </Card.Content>
          </Card.Root>
        </div>
      </div>
    </div>
  )
}
