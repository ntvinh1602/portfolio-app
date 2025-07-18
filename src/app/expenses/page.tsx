"use client"

import * as React from "react"
import { format } from "date-fns"
import { PageContent, PageHeader, PageMain } from "@/components/page-layout"
import {
  ChartBarStacked,
  BarStackedSkeleton,
} from "@/components/charts/stacked-barchart"
import {
  Piechart,
  PiechartSkeleton,
} from "@/components/charts/piechart"
import { useExpensesData } from "@/hooks/useExpensesData"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { ChartConfig } from "@/components/ui/chart"

const monthlyChartConfig = {
  trading_fees: {
    label: "Fees",
    color: "var(--chart-1)",
  },
  taxes: {
    label: "Taxes",
    color: "var(--chart-2)",
  },
  interest: {
    label: "Interest",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const structureChartConfig = {
  "Trading Fees": {
    label: "Fees",
    color: "var(--chart-1)",
  },
  "Taxes": {
    label: "Taxes",
    color: "var(--chart-2)",
  },
  "Interest": {
    label: "Interest",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export default function Page() {
  const {
    monthlyExpenses,
    monthlyLoading,
    expenseStructure,
    structureLoading,
  } = useExpensesData()

  const formattedMonthlyData = monthlyExpenses
    .slice()
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
    .map(item => {
      const total = item.trading_fees + item.taxes + item.interest
      return {
        ...item,
        month: format(new Date(item.month), "MMM ''yy"),
        total,
      }
    })

  const preparedExpenseStructure = expenseStructure.map(item => ({
    ...item,
    fill: structureChartConfig[item.category as keyof typeof structureChartConfig]
      ?.color,
  }))

  return (
    <PageMain>
      <PageHeader title="Expenses" />
      <PageContent>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
            <CardDescription>
              Stuff that ate your gains in the last 12 months
            </CardDescription>
          </CardHeader>
          <div className="px-4">
            {monthlyLoading ? (
              <BarStackedSkeleton />
            ) : (
              <ChartBarStacked
                data={formattedMonthlyData}
                config={monthlyChartConfig}
                labelKey="total"
                className="h-[360px] w-full"
              />
            )}
          </div>
          <div className="px-6">
            <Separator />
          </div>
          <div className="flex flex-col">
            <CardHeader>
              <CardTitle>Expenses Structure</CardTitle>
              <CardDescription>
                How expense distributed since the beginning
              </CardDescription>
            </CardHeader>
            <div className="px-4">
              {structureLoading ? (
                <PiechartSkeleton />
              ) : (
                <Piechart
                  data={preparedExpenseStructure}
                  chartConfig={structureChartConfig}
                  nameKey="category"
                  dataKey="total_amount"
                  className="h-[360px] w-full"
                  legend="right"
                  centerText="Total"
                />
              )}
            </div>
          </div>
        </Card>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}