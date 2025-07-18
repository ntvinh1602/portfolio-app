import * as React from "react"

import { useRouter } from "next/navigation"
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
  Wrench,
  FileQuestion,
  LogOut,
  UserRound,
} from "lucide-react"
   
export function HeaderNav() {
  const [user, setUser] = React.useState({
    name: "Anonymous",
    email: "",
    avatar: "",
  })

  const router = useRouter()

  const secondaryMenuItems = [
    { icon: Wrench, label: "Settings", path: "/settings" },
    { icon: FileQuestion, label: "Help", path: "/help" },
  ]

  const handleNavigation = (path: string) => {
    router.push(path)
  }

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
      <DropdownMenuTrigger>
          <UserRound className="size-6 stroke-[1] text-accent-foreground dark:text-accent-foreground"/>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-2xl bg-card/40 backdrop-blur-sm w-56"
      >
        <DropdownMenuLabel className="p-0 flex items-center gap-3 px-2 py-1.5">
          <UserRound className="stroke-[1]"/>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-light">{user.name}</span>
            <span className="text-muted-foreground font-thin truncate text-xs">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {secondaryMenuItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => handleNavigation(item.path)}
          >
            <item.icon className="text-foreground stroke-[1]"/>{item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-variant="destructive"
          onClick={handleSignOut}
        >
          <LogOut />Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
  