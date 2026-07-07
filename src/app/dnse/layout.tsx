import { ReactNode } from "react"
import MainLayout from "@/components/layout/body-layout"

export default function DnseLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
