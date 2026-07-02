// src/app/fund/dashboard/layout.tsx
import { AutoRefresh } from "@/components/auto-refresh"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AutoRefresh />
      {children}
    </>
  )
}