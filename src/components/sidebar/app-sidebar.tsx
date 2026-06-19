"use client"

import {
  TrendingUp,
  LogOut,
  Plane,
  PiggyBank,
} from "lucide-react"
import { NavMenu } from "@/components/sidebar/nav-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ConfirmDialog } from "../confirmation"

const data = {
  navMenu: [
    {
      title: "Fund",
      url: "#",
      icon: PiggyBank,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/fund/dashboard"
        },
        {
          title: "Annual Recaps",
          url: "/fund/annual-recaps"
        },
        {
          title: "Balance Sheet",
          url: "/fund/balance-sheet"
        },
        {
          title: "Transactions",
          url: "/fund/transactions"
        }
      ]
    },
    {
      title: "Flights",
      url: "#",
      icon: Plane,
      isActive: true,
      items: [
        {
          title: "Map",
          url: "/flights/map",
        },
        {
          title: "History",
          url: "/flights/history",
        }
      ]
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TrendingUp className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Master Portfolio</span>
                  <span className="">v1.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
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