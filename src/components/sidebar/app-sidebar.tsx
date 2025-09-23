"use client"

import {
  Settings,
  TrendingUp,
  FolderSearch,
  LogOut,
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
      title: "Database",
      url: "#",
      icon: FolderSearch,
      isActive: true,
      items: [
        {
          title: "Assets",
          url: "/assets",
        },
        {
          title: "Transactions",
          url: "/transactions",
        },
      ],
    },
    {
      title: "Configuration",
      url: "#",
      icon: Settings,
      isActive: true,
      items: [
        {
          title: "Settings",
          url: "/settings",
        },
      ]
    }
  ]
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
          <h1 className="text-xl">Portfolio Tracker</h1>
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