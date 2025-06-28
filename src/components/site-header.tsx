import * as React from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

interface SiteHeaderProps {
  title?: string
  onInfoClick?: () => void
}

export function SiteHeader({ title = "Untitled", onInfoClick }: SiteHeaderProps) {

  return (
    <header className="flex items-center py-4 max-w-4xl xl:mx-auto w-full">
      <div className="flex flex-col w-full gap-1 px-2 lg:gap-2 lg:px-6">
        <div className="flex w-full justify-between">
          <SidebarTrigger />
          <Button
          variant="ghost"
          onClick={onInfoClick}
          >
            <Info className="size-6 text-foreground"/>
          </Button>
        </div>
        <h1 className="text-3xl font-medium px-3 font-besley-serif">{title}</h1>
      </div>
    </header>
  )
}
