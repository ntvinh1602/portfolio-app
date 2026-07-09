import { ReactNode, Suspense } from "react"
import PageLayout from "@/components/layout/page-layout"

export default function DnseLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <PageLayout>{children}</PageLayout>
    </Suspense>
  )
}
