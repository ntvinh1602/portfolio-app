import { ReactNode } from "react"
import MainLayout from "@/components/main-layout"

export default function FundLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}