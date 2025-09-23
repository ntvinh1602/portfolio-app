"use client"

import { ChevronRight, Monitor, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Group,
  GroupLabel,
  Menu,
  MenuAction,
  MenuButton,
  MenuItem,
  MenuSub,
  MenuSubButton,
  MenuSubItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

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
    <Group>
      <GroupLabel>Pages</GroupLabel>
      <Menu>
        <MenuButton tooltip="Dashboard">
          <Link href="/" className="flex items-center gap-2">
            <Monitor className="size-4"/>
            <span className="font-light">Dashboard</span>
          </Link>
        </MenuButton>
        {items.map((item) => (
          <Collapsible key={item.title} defaultOpen={item.isActive}>
            <CollapsibleTrigger asChild>
              <MenuItem>
                <MenuButton asChild tooltip={item.title}>
                  <div className="flex select-none">
                    <item.icon/>
                    <span className="font-light">{item.title}</span>
                  </div>
                </MenuButton>
                {item.items?.length ?
                  <MenuAction>
                    <ChevronRight />
                    <span className="sr-only">Toggle</span>
                  </MenuAction>
                 : null}
              </MenuItem>
            </CollapsibleTrigger>
            {item.items?.length ? (
              <CollapsibleContent>
                <MenuSub>
                  {item.items?.map((subItem) => (
                    <MenuSubItem key={subItem.title}>
                      <MenuSubButton asChild>
                        <a href={subItem.url}>
                          <span className="font-light text-muted-foreground">
                            {subItem.title}
                          </span>
                        </a>
                      </MenuSubButton>
                    </MenuSubItem>
                  ))}
                </MenuSub>
              </CollapsibleContent>
            ) : null}
          </Collapsible>
        ))}
      </Menu>
    </Group>
  )
}

