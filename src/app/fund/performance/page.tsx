import { Suspense } from "react"
import { PerformanceYearProvider } from "@fund/components/performance/context"
import { Performance } from "@fund/components/performance/wrapper"

export default function Page() {
  return (
    <Suspense>
      <PerformanceYearProvider startYear={2021}>
        <Performance />
      </PerformanceYearProvider>
    </Suspense>
  )
}
