"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./sidebar/app-sidebar"
import { Toaster } from "./ui/sonner"
import { SidebarProvider, SidebarInset } from "./ui/sidebar"
import { ThemeProvider } from "@/context/theme-provider"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeSwitch } from "./theme-switch"
import { TooltipProvider } from "./ui/tooltip"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean)

  if (segments.length === 0) {
    return [{ label: "Dashboard" }]
  }

  return segments.map((segment, i) => {
    const label = formatSegment(segment)
    const isLast = i === segments.length - 1
    if (isLast) return { label }
    const href = "/" + segments.slice(0, i + 1).join("/")
    return { label, href }
  })
}

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <div className="flex flex-col h-full">
      {isLoginPage ? ( // On /login → no sidebar
        <>
          <Toaster />
          {children}
        </>
      ) : ( // On other pages → show sidebar layout
        <ThemeProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar collapsible="icon" />
              <SidebarInset className="md:px-4">
                <Toaster />
                <header className="flex h-16 shrink-0 justify-between items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <div>
                      <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                      />
                    </div>
                    <Breadcrumb>
                      <BreadcrumbList>
                        {breadcrumbs.map((crumb, i) => (
                          <div key={crumb.label} className="flex items-center gap-2">
                            {i > 0 && (
                              <BreadcrumbSeparator className="hidden md:block" />
                            )}
                            <BreadcrumbItem
                              className={
                                i < breadcrumbs.length - 1
                                  ? "hidden md:block"
                                  : undefined
                              }
                            >
                              {crumb.href ? (
                                <BreadcrumbLink href={crumb.href}>
                                  {crumb.label}
                                </BreadcrumbLink>
                              ) : (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                              )}
                            </BreadcrumbItem>
                          </div>
                        ))}
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>
                  <ThemeSwitch />
                </header>

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
