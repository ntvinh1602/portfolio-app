import { Suspense } from "react"
import getPerformance from "@/features/fund/actions/get-performance"
import {
  Performance,
  PerformanceSkeleton,
} from "@fund/components/performance/wrapper"

export default function Page() {
  return (
    <Suspense fallback={<PerformanceSkeleton />}>
      <PerformanceCard />
    </Suspense>
  )
}

async function PerformanceCard() {
  const data = await getPerformance()
  return <Performance results={data} startYear={2021} />
}
