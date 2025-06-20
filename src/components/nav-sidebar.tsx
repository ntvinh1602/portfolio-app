"use client"

import * as React from "react"
import {
  IconTransform,
  IconDashboard,
  IconDeviceAnalytics,
  IconReportMoney,
  IconPigMoney,
  IconSettings,
  IconHelp,
} from "@tabler/icons-react"
import { NavItems } from "@/components/nav-items"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDeviceAnalytics,
    },
    {
      title: "Assets",
      url: "/assets",
      icon: IconReportMoney,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: IconTransform,
    },
    {
      title: "Performance",
      url: "/performance",
      icon: IconDashboard,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Help",
      url: "/help",
      icon: IconHelp
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                  <IconPigMoney />
                </div> 
                <span className="text-lg font-semibold">
                  Portfolio Tracker
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavItems items={data.navMain} />
        <NavItems items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
