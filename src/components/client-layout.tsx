"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./sidebar/app-sidebar"
import { Toaster } from "./ui/sonner"
import { SidebarProvider, SidebarInset } from "./ui/sidebar"
import { ThemeProvider } from "../context/theme-provider"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeDropdown } from "./theme-picker"

function formatTitle(pathname: string): string {
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean)

  if (segments.length === 0) return "Dashboard"

  const segment =
    segments.length > 1
      ? segments[segments.length - 1]
      : segments[0]

  return segment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"
  const pageTitle = formatTitle(pathname)

  return (
    <div className="h-full">
      {isLoginPage ? ( // On /login → no sidebar
        <>
          <Toaster />
          {children}
        </>
      ) : ( // On other pages → show sidebar layout
        <ThemeProvider>
          <SidebarProvider>
            <AppSidebar collapsible="icon" />

            <SidebarInset className="md:px-4">
              <Toaster />

              {/* FULL HEIGHT APP CONTAINER */}
              <div className="flex min-h-dvh flex-col">

                {/* HEADER (fixed height) */}
                <header className="flex items-center w-full justify-between px-6 py-2 md:px-0 gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <Separator
                      orientation="vertical"
                      className="data-[orientation=vertical]:h-4 -ml-2"
                    />
                    <h1 className="text-base">{pageTitle}</h1>
                  </div>
                  <ThemeDropdown />
                </header>

                {/* CONTENT AREA (critical fix) */}
                <main className="flex-1 min-h-0 flex flex-col pb-4">
                  {children}
                </main>

              </div>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      )}
    </div>
  )
}
