import { Suspense } from "react"
import getRecaps from "@fund/actions/get-recaps"
import AnnualRecaps from "@fund/components/annual-recaps/wrapper"
import SimpleListSkeleton from "@/components/skeletons/simple-list"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import { Skeleton } from "@/components/ui/skeleton"
import PieChartCardSkeleton from "@/components/skeletons/piechart"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="@container/main flex flex-1 flex-col px-4 pb-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 w-8/10 gap-4 mx-auto">
            <div className="flex flex-col gap-4">
              <Skeleton className="w-full h-10 rounded-full"/>
              <div className="grid grid-cols-2 gap-4 h-fit">
              <ChartCardSkeleton
                title="Net Cashflow"
                showMetricsSection={false}
              />
                <PieChartCardSkeleton title="Total Expenses" />
              </div>
              <SimpleListSkeleton title="Best Performers" />
            </div>

            <div className="flex flex-col flex-1 gap-4">
              <ChartCardSkeleton
                title="Net Profit"
                description1="avg. profit"
                description2="avg. cost"
              />
              <ChartCardSkeleton
                title="Alpha"
                description1="equity return"
                description2="VNI return"
              />
            </div>
          </div>
        </div>
      }
    >
      <AnnualRecapsData />
    </Suspense>
  )
}

async function AnnualRecapsData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const recaps = await getRecaps()
  return <AnnualRecaps recaps={recaps} startYear={2021} />
}
