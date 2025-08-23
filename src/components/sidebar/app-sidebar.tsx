"use client"

import * as React from "react"
import {
  Wrench,
  FileQuestion,
  TrendingUp,
  Sprout,
  Coins,
  Gauge,
  LogOut,
  Plus
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavSecondary } from "@/components/sidebar/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { TransactionForm } from "@/components/forms/transaction/add-transaction"
import Link from "next/link"

const data = {
  navMain: [
    {
      title: "Assets",
      url: "#",
      icon: Sprout,
      isActive: true,
      items: [
        {
          title: "Debts",
          url: "/debts",
        },
      ],
    },
    {
      title: "History",
      url: "#",
      icon: Coins,
      isActive: true,
      items: [
        {
          title: "Transactions",
          url: "/transactions",
        },
      ],
    },
    {
      title: "Performance",
      url: "#",
      icon: Gauge,
      isActive: true,
      items: [
        {
          title: "Key Metrics",
          url: "/metrics",
        },
        {
          title: "Monthly Earnings",
          url: "/earnings",
        },
        {
          title: "Expenses Analysis",
          url: "/expenses",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Wrench,
    },
    {
      title: "Help",
      url: "/help",
      icon: FileQuestion,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const router = useRouter()
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <TrendingUp className="size-4"/>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight font-light truncate">
                  <span >Portfolio Tracker</span>
                  <span className="text-xs">To the Moon!</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              <Plus className="stroke-1" />Add Transaction
            </Button>
        </SidebarGroup>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="text-destructive"
        >
          <LogOut className="stroke-1" />Logout
        </Button>
      </SidebarFooter>
      <TransactionForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transactionType="buy"
      />
    </Sidebar>
  )
}
