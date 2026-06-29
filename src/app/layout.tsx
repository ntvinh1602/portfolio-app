import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

const manrope = Manrope({subsets:['latin-ext'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Logbook",
  description: "A personal finance dashboard for tracking investments — plus a flight log for travel history",
  
  // Disable indexing for search engines
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", manrope.variable, "dark")}>
      <head />
      <body className="antialiased text-foreground bg-background">
        {children}
      </body>
    </html>
  )
}
