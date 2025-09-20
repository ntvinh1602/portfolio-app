"use client"

import { ChevronRight, Monitor, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMenu({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Pages</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuButton tooltip="Dashboard">
          <a href="/" className="flex items-center gap-2">
            <Monitor className="size-4"/>
            <span className="font-light">Dashboard</span>
          </a>
        </SidebarMenuButton>
        {items.map((item) => (
          <Collapsible key={item.title} defaultOpen={item.isActive}>
            <CollapsibleTrigger asChild>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <div className="flex select-none">
                    <item.icon/>
                    <span className="font-light">{item.title}</span>
                  </div>
                </SidebarMenuButton>
                {item.items?.length ?
                  <SidebarMenuAction>
                    <ChevronRight />
                    <span className="sr-only">Toggle</span>
                  </SidebarMenuAction>
                 : null}
              </SidebarMenuItem>
            </CollapsibleTrigger>
            {item.items?.length ? (
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span className="font-light text-muted-foreground">
                            {subItem.title}
                          </span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            ) : null}
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

