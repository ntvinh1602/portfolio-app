"use client"

import * as React from "react"
import {
  Import,
  Gauge,
  Wrench,
  MonitorCheck,
  FileQuestion,
  ChartLine,
  Handshake,
  Notebook,
  ShoppingBag
} from "lucide-react"
import { NavItems } from "@/components/sidebar/items"
import { NavUser } from "@/components/sidebar/user"
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
      title: "Balance Sheet",
      url: "/balance-sheet",
      icon: Notebook,
    },
    {
      title: "Holdings",
      url: "/holdings",
      icon: ShoppingBag,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Handshake,
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <h1 className="text-xl font-semibold">
                  Portfolio Tracker
                </h1>
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
