"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function resolveTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always initialize to "dark" to match the server render.
  // The inline <script> in <head> already sets the correct class
  // before hydration, so the first render is always consistent.
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  // Hydrate the actual theme preference from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "dark" || saved === "light") {
      setTheme(saved)
    } else {
      setTheme(resolveTheme())
    }
    setMounted(true)
  }, [])

  // Sync theme to DOM + storage (skip the initial server-matching render)
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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