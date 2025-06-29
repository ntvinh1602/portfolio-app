import * as React from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Info,
  RefreshCw
} from "lucide-react"

interface SiteHeaderProps {
  title?: string
  onInfoClick?: () => void
  onRefresh?: () => void
}

export function SiteHeader({ title = "Untitled", onInfoClick, onRefresh }: SiteHeaderProps) {

  return (
    <header className="flex items-center py-4 max-w-4xl xl:mx-auto w-full">
      <div className="flex flex-col w-full gap-1 px-2 lg:gap-2 lg:px-6">
        <div className="flex w-full justify-between items-center">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            {title === "Portfolio" && (
            <Button
              variant="outline"
              className="rounded-full h-6 text-xs bg-card"
              onClick={onRefresh}
            >
              <RefreshCw className="size-3 text-sidebar-foreground"/>Price
            </Button>
          )}
            <Button
              variant="ghost"
              onClick={onInfoClick}
            >
              <Info className="size-6"/>
            </Button>
          </div>
        </div>
        <div className="flex w-full px-2 justify-between items-center">
          <h1 className="text-3xl font-medium font-besley-serif">{title}</h1>
          
        </div>
      </div>
    </header>
  )
}
