import { ReactNode, Suspense } from "react"
import PageLayout from "@/components/layout/page-layout"

export default function FlightLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <PageLayout>{children}</PageLayout>
    </Suspense>
  )
}