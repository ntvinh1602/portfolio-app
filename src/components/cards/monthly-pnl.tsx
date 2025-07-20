import { BarChart } from "../charts/barchart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { ChartConfig } from "../ui/chart"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { compactNum, formatNum } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

export type MonthlyPnlData = {
  month: string
  pnl: number
}

interface PnLCardProps {
  mtdPnl: number | null;
  avgPnl: number | null;
  monthlyPnlData: MonthlyPnlData[];
}

const chartConfig = {
  pnl: { label: "PnL" },
} satisfies ChartConfig

function PnLCard({ mtdPnl, avgPnl, monthlyPnlData }: PnLCardProps) {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/earnings")
  }

  return (
    <Card className="gap-4 h-full">
      <CardHeader className="px-4">
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          P/L this month<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl">
          {mtdPnl !== null ? formatNum(mtdPnl) : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Badge variant="outline">
            {avgPnl !== null ? formatNum(avgPnl) : "..."}
          </Badge>
          <CardDescription className="text-xs">12-month avg.</CardDescription>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-4">
        <BarChart
          data={monthlyPnlData}
          config={chartConfig}
          dataKey="pnl"
          categoryKey="month"
          className="h-[180px] w-full"
          yAxisTickFormatter={(value) => compactNum(Number(value))}
          xAxisTickFormatter={(value) => format(new Date(value), "MMM ''yy")}
        />
      </CardFooter>
    </Card>
  )
}

function PnLCardSkeleton() {
  return (
    <Card className="gap-4 h-full">
      <CardHeader className="px-4">
        <CardDescription className="flex items-center gap-1 w-fit">
          P/L this month<ChevronRight className="size-4" />
        </CardDescription>
        <CardTitle className="text-2xl">
          <Skeleton className="h-8 w-24" />
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Skeleton className="h-4 w-16" />
          <CardDescription className="text-xs">
            <Skeleton className="h-3 w-24" />
          </CardDescription>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-4">
        <Skeleton className="h-[180px] w-full" />
      </CardFooter>
    </Card>
  )
}

export {
  PnLCard,
  PnLCardSkeleton
}