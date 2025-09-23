"use client"

import { memo } from "react"
import { Trigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { TabSwitcher } from "@/components/tab-switcher"
import { Moon, Sun } from "lucide-react"

export const Header = memo(({ title }: { title: string }) => {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
    return (
      <header className="flex items-center w-full justify-between px-6 py-4 md:px-0 md:py-2 gap-2">
        <div className="flex items-center gap-2">
          <Trigger />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4 -ml-2"
          />
          <h1 className="text-xl">{title}</h1>
        </div>
        <div className="flex items-center">
          {mounted && (
            <TabSwitcher
              variant="switch"
              value={resolvedTheme ?? "light"}
              onValueChange={setTheme}
              options={[
                {
                  value: "light",
                  label: "Light",
                  icon: Sun
                },
                {
                  value: "dark",
                  label: "Dark",
                  icon: Moon
                },
              ]}
            />
          )}
        </div>
      </header>
    )
})

Header.displayName = 'Header'
