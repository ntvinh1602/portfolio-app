"use client"

import * as React from "react"
import {
  Settings,
  TrendingUp,
  FolderSearch,
  LogOut,
  Plus,
  RefreshCw
} from "lucide-react"
import { mutate } from "swr"
import { useState } from "react"
import { CollapsibleMenu } from "@/components/sidebar/collapsible-menu"
import { SinglePage } from "@/components/sidebar/single-page"
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
import { TransactionForm } from "@/components/sidebar/transaction/add-transaction"
import Link from "next/link"
import { Separator } from "../ui/separator"

const data = {
  collapsibleMenu: [
    {
      title: "Database",
      url: "#",
      icon: FolderSearch,
      isActive: true,
      items: [
        {
          title: "Transactions",
          url: "/transactions",
        },
      ],
    },
    {
      title: "Configuration",
      url: "#",
      icon: Settings,
      isActive: true,
      items: [
        {
          title: "Settings",
          url: "/settings",
        },
        {
          title: "Assets",
          url: "/assets-control",
        },
      ]
    }
  ],
  singlePage: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isTxnFormOpen, setTxnFormOpen] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetch('/api/external/refresh-prices', { method: 'POST' })
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
        <CollapsibleMenu items={data.collapsibleMenu} />
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarMenuButton onClick={() => setTxnFormOpen(true)}>
            <Plus />
            <span className="font-light text-muted-foreground">Add Transaction</span>
          </SidebarMenuButton>
          <SidebarMenuButton onClick={handleRefresh}>
            <RefreshCw className={`${isRefreshing && "animate-spin"}`} />
            <span className="font-light text-muted-foreground">Refresh Prices</span>
          </SidebarMenuButton>
        </SidebarGroup>
        <SinglePage items={data.singlePage} className="mt-auto"/>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <SidebarMenuButton onClick={handleSignOut} className="text-red-400">
          <LogOut/>Logout
        </SidebarMenuButton>
      </SidebarFooter>
      <TransactionForm
        open={isTxnFormOpen}
        onOpenChange={setTxnFormOpen}
        defaultType="buy"
      />
    </Sidebar>
  )
}
