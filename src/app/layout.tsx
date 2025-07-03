import type { Metadata } from "next"
import {
  Playfair_Display,
  Roboto_Flex
} from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-providers"

const RobotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

const PlayfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${RobotoFlex.variable} ${PlayfairDisplay.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Portfolio Tracker" />
      </head>
      <body className="antialiased bg-muted">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
