"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { HeaderUser } from "./header-user"

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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

interface SiteHeaderProps {
  displayName?: string | null
  avatar?: string | null
}

export function SiteHeader({ displayName, avatar }: SiteHeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b border-border  backdrop-blur-xl bg-transparent">
      <div className="flex h-14 w-full items-center justify-between gap-2 pl-4">
        <div className="flex items-center gap-2">
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
                  {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                  <BreadcrumbItem
                    className={
                      i < breadcrumbs.length - 1 ? "hidden md:block" : undefined
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
        <HeaderUser displayName={displayName ?? null} avatar={avatar ?? null} />
      </div>
    </header>
  )
}
