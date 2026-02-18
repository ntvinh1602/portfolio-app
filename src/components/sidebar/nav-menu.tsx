"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export function NavMenu({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="gap-2">
      <SidebarGroupLabel className="relative text-xs text-muted-foreground before:absolute before:left-0 before:bottom-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:drop-shadow-[0_4px_6px_oklch(from_var(--primary)_l_c_h/0.4)]">
        Navigation
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.url !== "#" &&
            (pathname === item.url || pathname.startsWith(item.url + "/"))

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} size="lg">
                <Link
                  href={item.url}
                  className="flex items-center gap-3"
                >
                  <item.icon className="transition duration-300 data-[active=true]:text-primary data-[active=true]:drop-shadow-[0_4px_6px_oklch(from_var(--primary)_l_c_h/0.7)] hover:text-primary hover:drop-shadow-[0_4px_6px_oklch(from_var(--primary)_l_c_h/0.7)]" />
                  <span className="">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
