"use client"

import * as React from "react"
import {
  Settings,
  TrendingUp,
  FolderSearch,
  LogOut,
} from "lucide-react"
import { CollapsibleMenu } from "@/components/sidebar/collapsible-menu"
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
import { RefreshPricesButton } from "./refresh-price-button"

const data = {
  collapsibleMenu: [
    {
      title: "Database",
      url: "#",
      icon: FolderSearch,
      isActive: true,
      items: [
        {
          title: "Assets",
          url: "/assets",
        },
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
  const [isTxnFormOpen, setTxnFormOpen] = React.useState(false)

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
        <SidebarGroup className="flex gap-1">
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarMenuButton asChild>
            <TransactionForm open={isTxnFormOpen} onOpenChange={setTxnFormOpen}/>
          </SidebarMenuButton>
          <SidebarMenuButton asChild>
            <RefreshPricesButton />
          </SidebarMenuButton>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton onClick={handleSignOut} className="text-rose-400">
          <LogOut/>Logout
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}