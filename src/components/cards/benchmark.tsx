"use client"

import { Linechart } from "@/components/charts/linechart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

interface BenchmarkCardProps {
  lifetimeReturn: number | null
  ytdReturn: number | null
  benchmarkChartData: BenchmarkData[]
}

function BenchmarkCard({ lifetimeReturn, ytdReturn, benchmarkChartData }: BenchmarkCardProps) {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/metrics")
  }
  return (
    <Card className="gap-2 h-full">
      <CardHeader className="px-4">
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          Return on Equity<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl">
          {lifetimeReturn ? `${formatNum(lifetimeReturn*100, 2)}%` : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end self-center">
          <Badge variant="outline">
            {ytdReturn !== null && ytdReturn < 0 ? (
              <TrendingDown className="size-4 text-red-700 dark:text-red-400" />
            ) : (
              <TrendingUp className="size-4 text-green-700 dark:text-green-400" />
            )}
            {ytdReturn !== null && `${formatNum(ytdReturn*100, 2)}%`}
          </Badge>
          <CardDescription className="text-xs">Return YTD</CardDescription>
        </CardAction>
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
          className="h-[200px] w-full -ml-4"
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