import { Suspense } from "react"
import getPerformance from "@fund/actions/get-recaps"
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
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const data = await getPerformance()
  return <Performance results={data} startYear={2021} />
}
