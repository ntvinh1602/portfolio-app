"use client"

import { Linechart } from "@/components/charts/linechart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { format } from "date-fns"

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

interface BenchmarkCardProps {
  benchmarkChartData: BenchmarkData[];
  startDate: Date;
  endDate: Date;
}

function BenchmarkCard({ benchmarkChartData }: BenchmarkCardProps) {
  return (
    <Card className="gap-2 h-full">
      <CardHeader className="px-4">
        <CardDescription>Performance in the last 90 days</CardDescription>
        <CardTitle className="text-2xl"></CardTitle>
      </CardHeader>
      <CardFooter className="px-4">
        <Linechart
          data={benchmarkChartData}
          chartConfig={{
            portfolio_value: {
              label: "Equity",
              color: "var(--chart-1)",
            },
            vni_value: {
              label: "VN-Index",
              color: "var(--chart-2)",
            },
          }}
          className="h-[220px] w-full -ml-4"
          xAxisDataKey="date"
          lineDataKeys={["portfolio_value", "vni_value"]}
          grid={true}
          legend={true}
          xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
          yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
        />
      </CardFooter>
    </Card>
  )
}

function BenchmarkCardSkeleton() {
  return (
    <Card className="gap-2 h-full">
      <CardHeader className="px-4">
        <CardDescription>
          Performance in the last 90 days
        </CardDescription>
        <CardTitle className="text-2xl">
          <Skeleton className="h-8 w-32" />
        </CardTitle>
      </CardHeader>
      <CardFooter className="px-4">
        <Skeleton className="h-[210px] w-full" />
      </CardFooter>
    </Card>
  )
}

export {
  BenchmarkCard,
  BenchmarkCardSkeleton
}