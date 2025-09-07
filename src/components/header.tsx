"use client"

import * as React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import TabSwitcher from "@/components/tab-switcher"

export const Header = React.memo(({ title }: { title: string }) => {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
    return (
      <header className="flex items-center w-full justify-between px-6 py-4 md:px-0 md:py-2 gap-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4 -ml-2"
          />
          <h1 className="text-xl">{title}</h1>
        </div>
        <div className="flex items-center">
          {mounted && (
            <TabSwitcher
              onValueChange={setTheme}
              value={resolvedTheme ?? "light"}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" }
              ]}
              tabClassName="h-full flex flex-col justify-center"
            />
          )}
        </div>
      </header>
    )
})
