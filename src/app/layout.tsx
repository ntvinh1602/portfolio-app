import type { Metadata } from "next"
import { Roboto_Flex, Roboto_Condensed } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/client-layout"
import "leaflet/dist/leaflet.css"

const RobotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
})

const RobotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
})

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
      className={`${RobotoFlex.variable} ${RobotoCondensed.variable}`} suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem("color-theme");
                  const themes = ["default","green","violet","rose"];
                  if (theme && themes.includes(theme) && theme !== "default") {
                    document.documentElement.classList.add("theme-" + theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-fixed min-h-dvh">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
