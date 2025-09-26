"use client"

import { LiveDataProvider } from "@/app/dashboard/context/live-data-context"
import { Header } from "@/components/header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  
  return (
    <LiveDataProvider>
      <div className="flex flex-col md:h-svh pb-4">
        <Header title="Dashboard"/>
        {children}
      </div>
    </LiveDataProvider>
  )
}