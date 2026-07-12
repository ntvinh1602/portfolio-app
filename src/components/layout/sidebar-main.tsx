"use client"

import { Plane, PiggyBank, ClipboardPen } from "lucide-react"
import { NavMenu } from "@/components/layout/sidebar-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMenu: [
    {
      title: "Fund",
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
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
    </Sidebar>
  )
}
