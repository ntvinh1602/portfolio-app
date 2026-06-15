import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/client-layout"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils";

const figtree = Manrope({subsets:['latin-ext'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Double-entry accounting portfolio tracking app.",
  
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
    <html
      lang="en"
      className={cn("h-full", "font-sans", figtree.variable)} suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem("theme");
                  if (theme === "light") {
                    // User explicitly chose light
                  } else if (theme === "dark") {
                    document.documentElement.classList.add("dark");
                  } else {
                    // No saved preference — default to dark unless system says light
                    if (!window.matchMedia("(prefers-color-scheme: light)").matches) {
                      document.documentElement.classList.add("dark");
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-fixed h-full">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
