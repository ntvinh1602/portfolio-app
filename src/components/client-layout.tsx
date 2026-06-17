"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./sidebar/app-sidebar"
import { Toaster } from "./ui/sonner"
import { SidebarProvider, SidebarInset } from "./ui/sidebar"
import { ThemeProvider } from "@/context/theme-provider"
import { TooltipProvider } from "./ui/tooltip"
import { SiteHeader } from "./site-header"

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <div>
      <Toaster />
      {isLoginPage ? (
        <div className="flex min-h-svh w-full items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      ) : (
        <ThemeProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar collapsible="icon" />
              <SidebarInset>  
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      )}
    </div>
  )
}
