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
import { NavPrimary } from "@/components/sidebar-primary"
import { NavSecondary } from "@/components/sidebar-secondary"
import { NavUser } from "@/components/sidebar-user"
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
                <IconReportMoney className="!size-5" />
                <span className="text-base font-semibold">
                  My Investments
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavPrimary items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
