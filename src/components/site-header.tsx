"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

// A helper function to get the title from the pathname
const getTitle = (pathname: string) => {
  if (pathname === "/") return "Home"
  // Capitalize the first letter and remove the leading slash
  const title = pathname.substring(1)
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
        </div>
      </div>
    </header>
  )
}
