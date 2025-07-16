"use client"

import { BenchmarkChart } from "@/components/charts/benchmark-chart"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { subDays } from "date-fns"

export function BenchmarkCard() {
  const startDate = subDays(new Date(), 90)
  const endDate = new Date()

  return (
    <Card className="gap-2 h-full">
      <CardHeader className="px-4">
        <CardDescription>Performance in the last 90 days</CardDescription>
        <CardTitle className="text-2xl"></CardTitle>
      </CardHeader>
      <CardFooter className="px-4">
        <BenchmarkChart
          startDate={startDate}
          endDate={endDate}
          height="h-[210px]"
        />
      </CardFooter>
    </Card>
  )
}