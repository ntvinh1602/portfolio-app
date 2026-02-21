"use client"

import { Check, Settings2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useTheme } from "./theme-provider"

const themes = [
  {
    name: "Yellow",
    value: "default",
    color: "oklch(0.795 0.184 86.047)",
  },
  {
    name: "Green",
    value: "green",
    color: "oklch(0.75 0.18 145)",
  },
  {
    name: "Violet",
    value: "violet",
    color: "oklch(0.606 0.25 292.717)",
  },
  {
    name: "Rose",
    value: "rose",
    color: "oklch(0.645 0.246 16.439)",
  },
] as const

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Settings2/>Theme
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border shadow-sm"
                style={{ backgroundColor: t.color }}
              />
              {t.name}
            </div>

            {theme === t.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}