"use client"

import * as React from "react"
import { BottomNavBar, PageContent, PageHeader, PageMain } from "@/components/page-layout"
import { ExpensesChart } from "@/components/charts/monthly-expenses-chart"
import { ExpenseStructureChart } from "@/components/charts/expense-structure-chart"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function Page() {

  return (
    <PageMain>
      <PageHeader title="Expenses"/>
      <PageContent>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
            <CardDescription>
              Stuff that ate your gains in the last 12 months
            </CardDescription>
          </CardHeader>
          <div className="px-4">
            <ExpensesChart />
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
              <ExpenseStructureChart />
            </div>
          </div>
        </Card>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}