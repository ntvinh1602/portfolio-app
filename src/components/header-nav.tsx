import * as React from "react"

import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/supabaseClient"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import {
  Gauge,
  Wrench,
  FileQuestion,
  Handshake,
  Notebook,
  ShoppingBag,
  LogOut
} from "lucide-react"
   
export function HeaderNav() {
  const [user, setUser] = React.useState({
    name: "Anonymous",
    email: "",
    avatar: "",
  })
  
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  React.useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()

        setUser({
          name: profile?.display_name || "Anonymous",
          email: user.email || "",
          avatar: "",
        })
      }
    }

    fetchUser()
  }, [])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-12 w-12 rounded-full grayscale">
          <AvatarImage
            src={user.avatar}
            alt={user.name}
          />
          <AvatarFallback className="rounded-lg">
            Hi!
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border/50 rounded-2xl bg-card/25 backdrop-blur-sm w-56"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">Hi!</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50"/>
        <DropdownMenuItem>
          <Notebook />Balance Sheet
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ShoppingBag />Portfolio
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Handshake />Transaction
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Gauge />Performance
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50"/>
        <DropdownMenuItem>
          <Wrench />Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileQuestion />Help
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50"/>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut />Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
  