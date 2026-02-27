"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
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
    <SidebarGroup className="gap-4">
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
