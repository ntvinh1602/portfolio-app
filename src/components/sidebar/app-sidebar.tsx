"use client"

import {
  Settings,
  TrendingUp,
  FolderSearch,
  LogOut,
} from "lucide-react"
import { CollapsibleMenu } from "@/components/sidebar/collapsible-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { QuickActions } from "./quick-actions"

const data = {
  collapsibleMenu: [
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
  ],
  singlePage: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const supabase = createClient()
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenuButton size="lg" className="pointer-events-none">
          <div className="bg-primary aspect-square flex size-8 items-center justify-center rounded-lg">
            <TrendingUp className="size-4 text-primary-foreground"/>
          </div>
          <h1 className="text-xl">Portfolio Tracker</h1>
        </SidebarMenuButton>
      </SidebarHeader>
      
      <SidebarContent>
        <CollapsibleMenu items={data.collapsibleMenu} />
        <QuickActions/>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuButton
          onClick={handleSignOut}
          className="text-rose-400"
        >
          <LogOut/>Logout
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}