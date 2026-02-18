"use client"

import {
  Settings,
  TrendingUp,
  LogOut,
  TvMinimal,
  Handshake,
  Newspaper
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
import { QuickActions } from "./quick-actions"
import { ConfirmDialog } from "../confirmation"

const data = {
  navMenu: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: TvMinimal,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: Newspaper,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Handshake,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
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
      
      <SidebarContent>
        <NavMenu items={data.navMenu} />
        <QuickActions/>
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