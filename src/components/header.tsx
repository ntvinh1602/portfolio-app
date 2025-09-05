"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  Moon
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { Toggle } from "@/components/ui/toggle"

type HeaderProps = {
  title: string;
}
   
export function Header(param: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  function MobileHeader() {
    return ( 
      <header className="flex items-center p-6 w-full justify-between">
        <h1 className="text-3xl font-regular">{param.title}</h1>
      </header>
    )
  }

  function DesktopHeader() {
    return (
      <header className="flex items-center py-2 w-full border-b mb-4 justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger/>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4 -ml-2"
          />
          <h1 className="text-xl">{param.title}</h1>
        </div>
          {mounted ? (
            <Toggle
              pressed={resolvedTheme === "dark"}
              onPressedChange={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="font-thin"
            >
              <Moon className="stroke-1" />
              Night Mode
            </Toggle>
          ) : null}
      </header>
    )
  }

  return (
    <div>{isMobile ? <MobileHeader/> : <DesktopHeader/>}</div>
  )
}
  