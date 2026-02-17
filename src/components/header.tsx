"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function Header({ title }: { title: string }) {
  
    return (
      <header className="flex items-center w-full justify-between px-6 py-4 md:px-0 md:py-2 gap-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4 -ml-2"
          />
          <h1 className="text-base">{title}</h1>
        </div>
      </header>
    )
}
