import { ReactNode, Suspense } from "react"
import MainLayout from "@/components/layout/body-layout"

export default function DnseLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <MainLayout>{children}</MainLayout>
    </Suspense>
  )
}
