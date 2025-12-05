"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Separator } from "@/components/ui/separator"
import { YearSelect } from "@/components/year-select"
import { MonthlyChart } from "./components/monthly-chart"
import { ExpenseChart } from "./components/expense-chart"

export default function Page() {
  const [year, setYear] = useState("2025")

  return (
    <div className="flex flex-col pb-4">
      <Header title="Annual Reports" />
      <Separator className="mb-2" />
      <div className="grid grid-cols-2 w-7/10 mx-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-thin">
            <YearSelect value={year} onChange={setYear} startYear={2021} />
          </div>
          <MonthlyChart year={year} />
          <ExpenseChart year={year} />
        </div>
      </div>
    </div>
  )
}
