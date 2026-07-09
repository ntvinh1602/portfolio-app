"use client"

import { useRouter } from "next/navigation"
import { LogOut, User, UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface HeaderUserProps {
  displayName: string | null
  avatar: string | null
}

export function HeaderUser({ displayName, avatar }: HeaderUserProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="lg">
          <div className="grid flex-1 text-right text-sm leading-tight px-1">
            <span className="truncate text-xs text-muted-foreground">
              Hello
            </span>
            <span className="truncate font-semibold">
              {displayName ?? "User"}
            </span>
          </div>
          <Avatar>
            {avatar && <AvatarImage src={avatar} alt={displayName ?? "User"} />}
            <AvatarFallback>
              <UserIcon />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width)"
        side="bottom"
        align="end"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User data-icon="inline-start" />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ConfirmDialog
            message="Click Continue to finish logging out."
            onConfirm={handleSignOut}
          >
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              variant="destructive"
            >
              <LogOut data-icon="inline-start" />
              Log out
            </DropdownMenuItem>
          </ConfirmDialog>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
