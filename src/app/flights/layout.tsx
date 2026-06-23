import { ReactNode } from "react"
import MainLayout from "@/components/main-layout"

export default function FlightLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}