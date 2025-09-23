"use client"

import { ReactNode } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./sidebar/app-sidebar"
import { Toaster } from "./ui/sonner"
import { Provider, Inset } from "./ui/sidebar"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {isLoginPage ? ( // On /login → no sidebar
        <>
          <Toaster />
          {children}
        </>
      ) : ( // On other pages → show sidebar layout
        <Provider>
          <AppSidebar />
          <Inset className="md:px-4">
            <Toaster />
            {children}
          </Inset>
        </Provider>
      )}
    </ThemeProvider>
  )
}
