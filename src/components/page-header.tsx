import * as React from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

interface SiteHeaderProps {
  title?: string
  onInfoClick?: () => void
}

export function PageHeader({ title = "Untitled", onInfoClick }: SiteHeaderProps) {

  return (
    <header className="flex items-center py-4 max-w-4xl xl:mx-auto w-full">
      <div className="flex flex-col w-full gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex w-full justify-between items-center">
          <SidebarTrigger />
          <Button
            variant="ghost"
            onClick={onInfoClick}
          >
            <Info className="size-6"/>
          </Button>
        </div>
          <h1 className="text-3xl px-3 font-medium font-besley-serif">{title}</h1>
      </div>
    </header>
  )
}
