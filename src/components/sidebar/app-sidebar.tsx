"use client"

import {
  Settings,
  TrendingUp,
  LogOut,
  TvMinimal,
  PiggyBank,
  Handshake,
  Newspaper
} from "lucide-react"
import { NavMenu } from "@/components/sidebar/nav-menu"
import * as SB from "@/components/ui/sidebar"
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
      title: "Assets",
      url: "/assets",
      icon: PiggyBank,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Handshake,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: Newspaper,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof SB.Root>) {
  const router = useRouter()
  
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <SB.Root variant="inset" {...props}>
      <SB.Header>
        <SB.MenuButton size="lg" className="pointer-events-none">
          <div className="bg-primary aspect-square flex size-8 items-center justify-center rounded-lg">
            <TrendingUp className="size-4 text-primary-foreground"/>
          </div>
          <h1 className="text-xl font-normal text-foreground">Portfolio Tracker</h1>
        </SB.MenuButton>
      </SB.Header>
      
      <SB.Content>
        <NavMenu items={data.navMenu} />
        <QuickActions/>
      </SB.Content>

      <SB.Footer>
        <ConfirmDialog
          onConfirm={handleSignOut}
          message="Do you really want to log out?"
        >
          <SB.MenuButton>
            <LogOut/>Logout
          </SB.MenuButton>
        </ConfirmDialog>
      </SB.Footer>
    </SB.Root>
  )
}