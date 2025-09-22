"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"

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
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="md:px-4">
            <Toaster />
            {children}
          </SidebarInset>
        </SidebarProvider>
      )}
    </ThemeProvider>
  )
}
