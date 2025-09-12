"use client"

import * as React from "react"
import {
  Wrench,
  TrendingUp,
  Coins,
  Gauge,
  LogOut,
  Plus,
  RefreshCw
} from "lucide-react"
import { mutate } from "swr"
import { useState } from "react"
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
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { TransactionForm } from "@/components/forms/transaction/add-transaction"
import Link from "next/link"
import { Separator } from "../ui/separator"

const data = {
  navMain: [
    {
      title: "Archive",
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
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetch('/api/external/refresh-all-asset-prices', { method: 'POST' })
    await mutate((key: string) => typeof key === 'string'
      && key.startsWith(`/api/gateway/dashboard`))
    setIsRefreshing(false)
  }

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
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <TrendingUp className="size-4"/>
                </div>
                <h1 className="text-xl">Portfolio Tracker</h1>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarMenuButton onClick={() => setIsDialogOpen(true)}>
            <Plus />
            <span className="font-light">Add Transaction</span>
          </SidebarMenuButton>
          <SidebarMenuButton onClick={handleRefresh}>
            <RefreshCw className={`${isRefreshing && "animate-spin"}`} />
            <span className="font-light">Refresh Prices</span>
          </SidebarMenuButton>
        </SidebarGroup>
        <NavSecondary items={data.navSecondary} className="mt-auto"/>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <SidebarMenuButton onClick={handleSignOut} className="text-red-400">
          <LogOut/>Logout
        </SidebarMenuButton>
      </SidebarFooter>
      <TransactionForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transactionType="buy"
      />
    </Sidebar>
  )
}
