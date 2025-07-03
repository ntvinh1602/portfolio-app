"use client"

import { useTheme } from "next-themes"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, Palette } from "lucide-react"

export default function Page() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [accentTheme, setAccentTheme] = useState("default")

  useEffect(() => {
    setMounted(true)
    const storedAccent = localStorage.getItem("accent-theme") || "default"
    setAccentTheme(storedAccent)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.remove("theme-autumn")
    if (accentTheme === "autumn") {
      document.documentElement.classList.add("theme-autumn")
    }
    localStorage.setItem("accent-theme", accentTheme)
  }, [accentTheme, mounted])

  if (!mounted) {
    return null
  }

  const getThemeName = (currentTheme: string | undefined) => {
    if (currentTheme === "autumn") return "Autumn"
    return "Default"
  }

  return (
    <PageMain>
      <PageHeader title="Settings" />
      <PageContent>
        <Card>
          <CardTitle>Theme</CardTitle>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p>
                Current theme:{" "}
                <span className="font-semibold">{getThemeName(accentTheme)}</span>
              </p>
              <p>
                Mode:{" "}
                <span className="font-semibold">
                  {resolvedTheme === "dark" ? "Dark" : "Light"}
                </span>
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Palette className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Select Theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setAccentTheme("default")}>
                  Default
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAccentTheme("autumn")}>
                  Autumn
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Mode</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  Toggle Mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </PageContent>
    </PageMain>
  )
}
