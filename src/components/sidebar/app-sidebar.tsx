"use client"

import {
  Settings,
  TrendingUp,
  LogOut,
  Rss,
  BarChart3,
  Scale,
  Repeat,
  LayoutDashboard
} from "lucide-react"
import { NavMenu } from "@/components/sidebar/nav-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ConfirmDialog } from "../confirmation"
import { Separator } from "../ui/separator"

const data = {
  navMenu: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Balance Sheet",
      url: "/balance-sheet",
      icon: Scale,
    },
    {
      title: "Annual Recaps",
      url: "/annual-recaps",
      icon: BarChart3,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Repeat,
    },
    {
      title: "News",
      url: "/news",
      icon: Rss,
    }
  ],
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenuButton size="sm" variant="nohover" className="gap-4">
          <div
            className="
              aspect-square flex size-8 items-center justify-center rounded-lg
              border-2 border-primary animate-[glowPulse_3s_ease-in-out_infinite]
              shadow-[inset_0_0_6px_oklch(from_var(--primary)_l_c_h_/0.25)]
            "
          >
            <TrendingUp className="size-4 text-primary" />
          </div>

          <h1 className="text-xl font-normal text-foreground truncate">
            Portfolio Tracker
          </h1>
        </SidebarMenuButton>
      </SidebarHeader>
      
      <div className="h-fit relative text-xs text-muted-foreground before:absolute before:left-0 before:bottom-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:drop-shadow-[0_4px_6px_oklch(from_var(--primary)_l_c_h/0.4)]
      group-data-[collapsible=icon]:hidden
      "/>
      
      <SidebarContent className="pt-2">
        <NavMenu items={data.navMenu} />
      </SidebarContent>

      <SidebarFooter>
        <ConfirmDialog
          onConfirm={handleSignOut}
          message="Do you really want to log out?"
        >
          <SidebarMenuButton>
            <LogOut/>
            <span className="font-light">Logout</span>
          </SidebarMenuButton>
        </ConfirmDialog>
      </SidebarFooter>
    </Sidebar>
  )
}