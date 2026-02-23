"use client"

import { useState } from "react"
import {
  YearPicker,
  ProfitChart,
  ExpenseChart,
  TopStocks,
  Cashflow,
  ReturnChart,
} from "./components"

export default function Page() {
  const [year, setYear] = useState(new Date().getFullYear().toString())

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 flex-1 px-2 md:px-0">
      <YearPicker value={year} onChange={setYear} startYear={2022} />

      <div className="grid grid-cols-1 md:grid-cols-10 gap-6 flex-1">
        <div className="flex md:col-span-3 flex-col h-full">
          <TopStocks year={year} />
        </div>
        <div className="flex md:col-span-4 h-full flex-col gap-2 min-w-0">
          <ProfitChart year={year} />
          <ReturnChart year={year} />
        </div>
        <div className="flex md:col-span-3 flex-col gap-2 min-w-0 h-full">
          <Cashflow year={year} />
          <ExpenseChart year={year} />
        </div>
      </div>
    </div>
  )
}
