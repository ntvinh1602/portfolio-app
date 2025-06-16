"use client"

import * as React from "react"
import {
  IconTransform,
  IconDashboard,
  IconDeviceAnalytics,
  IconReportMoney,
  IconPigMoney,
  IconSettings,
} from "@tabler/icons-react"

import { NavMain } from "@/components/sidebar-content"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Assets",
      url: "/assets",
      icon: IconPigMoney,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: IconTransform,
    },
    {
      title: "Performance",
      url: "/performance",
      icon: IconDeviceAnalytics,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
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
                <IconReportMoney className="!size-5" />
                <span className="text-base font-semibold">My Investments</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  )
}
