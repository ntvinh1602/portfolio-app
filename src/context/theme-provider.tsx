"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "default" | "green" | "violet" | "rose"

const THEMES: Theme[] = ["default", "green", "violet", "rose"]

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "default"
    const saved = localStorage.getItem("color-theme")
    return THEMES.includes(saved as Theme) ? (saved as Theme) : "default"
  })

  // Sync theme to DOM + storage
  useEffect(() => {
    document.documentElement.classList.remove(
      ...THEMES.map((t) => `theme-${t}`)
    )

    if (theme !== "default") {
      document.documentElement.classList.add(`theme-${theme}`)
    }

    localStorage.setItem("color-theme", theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}