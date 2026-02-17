"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./sidebar/app-sidebar"
import { Toaster } from "./ui/sonner"
import { SidebarProvider, SidebarInset } from "./ui/sidebar"

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <div>
      {isLoginPage ? ( // On /login → no sidebar
        <>
          <Toaster />
          {children}
        </>
      ) : ( // On other pages → show sidebar layout
        <SidebarProvider>
          <AppSidebar collapsible="icon" />
          <SidebarInset className="md:px-4">
            <Toaster />
            {children}
          </SidebarInset>
        </SidebarProvider>
      )}
    </div>
  )
}
