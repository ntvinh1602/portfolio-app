import { TrendingUp, TrendingDown } from "lucide-react"
import { Linechart } from "@/components/charts/base-charts/linechart"
import { formatNum } from "@/lib/utils"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { compactNum } from "@/lib/utils"

type EquityData = {
  date: string
  net_equity_value: number
}

interface EquityCardProps {
  latestEquity: number | null;
  twr: number | null;
  equityChartData: EquityData[];
  startDate: Date;
  endDate: Date;
}

export function EquityCard({ latestEquity, twr, equityChartData, startDate, endDate }: EquityCardProps) {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/analytics")
  }

  return (
    <Card className="gap-4 h-full">
      <CardHeader className="px-4">
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          Net worth<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl">
          {latestEquity ? formatNum(latestEquity) : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Badge variant="outline">
            {twr !== null && twr < 0 ? (
              <TrendingDown className="size-4 text-red-700 dark:text-red-400" />
            ) : (
              <TrendingUp className="size-4 text-green-700 dark:text-green-400" />
            )}
            {twr !== null && `${(twr * 100).toFixed(2)}% `}
          </Badge>
          <CardDescription className="text-xs">Last 90 days</CardDescription>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-4">
        <Linechart
          data={equityChartData}
          chartConfig={{
            net_equity_value: {
              label: "Equity",
              color: "var(--chart-1)",
            },
          }}
          className="h-[180px] w-full"
          xAxisDataKey="date"
          lineDataKeys={["net_equity_value"]}
          grid={true}
          xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
          yAxisTickFormatter={(value) => compactNum(Number(value))}
        />
      </CardFooter>
    </Card>
  )
}
