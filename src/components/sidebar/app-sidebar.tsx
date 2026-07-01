"use client"

import { LogOut, Plane, PiggyBank, ClipboardPen, Landmark } from "lucide-react"
import { NavMenu } from "@/components/sidebar/nav-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ConfirmDialog } from "../confirm-dialog"

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
          url: "/fund/dashboard",
        },
        {
          title: "Performance",
          url: "/fund/performance",
        },
        {
          title: "Events",
          url: "/fund/transactions",
        },
      ],
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
        },
      ],
    },
    {
      title: "DNSE",
      url: "#",
      icon: Landmark,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/dnse",
        },
      ],
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
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ClipboardPen className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Logbook</span>
                <span className="text-xs">things worth tracking</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMenu items={data.navMenu} />
      </SidebarContent>

      <SidebarFooter>
        <ConfirmDialog
          onConfirm={handleSignOut}
          message="Do you really want to log out?"
        >
          <SidebarMenuButton>
            <LogOut />
            <span className="font-light">Logout</span>
          </SidebarMenuButton>
        </ConfirmDialog>
      </SidebarFooter>
    </Sidebar>
  )
}
