"use client"

import * as React from "react"
import {
  Import,
  Gauge,
  Wrench,
  MonitorCheck,
  FileQuestion,
  ChartLine,
  ShoppingCart,
  DollarSign
} from "lucide-react"
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
      icon: MonitorCheck,
    },
    {
      title: "Assets",
      url: "/assets",
      icon: DollarSign,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: ShoppingCart,
    },
    {
      title: "Performance",
      url: "/performance",
      icon: Gauge,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Wrench,
    },
    {
      title: "Import Data",
      url: "/import",
      icon: Import,
    },
    {
      title: "Help",
      url: "/help",
      icon: FileQuestion
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <div className="flex items-center justify-center">
                  <ChartLine className="!size-8" strokeWidth={1.5} />
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
