"use client"

import * as React from "react"
import { format } from "date-fns"
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
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()
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
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Expenses"/>
        <Card className="py-0 border-0">
          <CardHeader className="px-0">
            <CardTitle>Monthly Expenses</CardTitle>
            <CardDescription>
              Stuff that ate your gains in the last 12 months
            </CardDescription>
          </CardHeader >
          <div>
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
          <Separator />
          <div className="flex flex-col">
            <CardHeader className="px-0">
              <CardTitle>Expenses Structure</CardTitle>
              <CardDescription>
                How expense distributed since the beginning
              </CardDescription>
            </CardHeader>
            <div>
              {structureLoading ? (
                <PiechartSkeleton />
              ) : (
                <Piechart
                  data={preparedExpenseStructure}
                  chartConfig={structureChartConfig}
                  nameKey="category"
                  dataKey="total_amount"
                  className="h-[240px] w-full"
                  legend="right"
                  centerText="Total"
                  label_pos={1.6}
                />
              )}
            </div>
          </div>
        </Card>
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}