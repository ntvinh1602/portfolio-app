import * as React from "react"

import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import avatar from 'animal-avatar-generator'
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
  TvMinimal,
  PiggyBank,
  Gauge,
  Wrench,
  FileQuestion,
  Handshake,
  LogOut
} from "lucide-react"
   
export function HeaderNav() {
  const [user, setUser] = React.useState({
    name: "Anonymous",
    email: "",
    avatar: "",
  })
  const [avatarSvg, setAvatarSvg] = React.useState("")

  const router = useRouter()

  const menuItems = [
    { icon: TvMinimal, label: "Home", path: "/" },
    {
      icon: PiggyBank,
      label: "Assets",
      path: "/assets",
      subMenu: [
        { label: "Holdings", path: "/assets/holdings" },
        { label: "Debts", path: "/assets/debts" },
      ],
    },
    { icon: Handshake, label: "Transaction", path: "/transactions" },
    { icon: Gauge,
      label: "Analytics",
      path: "/analytics",
      subMenu: [
        { label: "Earnings", path: "/analytics/earnings" },
        { label: "Expenses", path: "/analytics/expenses" },
      ],
    },
  ]

  const secondaryMenuItems = [
    { icon: Wrench, label: "Settings", path: "/settings" },
    { icon: FileQuestion, label: "Help", path: "/" },
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

  React.useEffect(() => {
    if (user.email) {
      const svgString = avatar(user.email, { size: 128 })
      const dataUri = `data:image/svg+xml;base64,${btoa(svgString)}`
      setAvatarSvg(dataUri)
    }
  }, [user.email])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-12 w-12 border-2 border-primary dark:grayscale">
          <AvatarImage src={avatarSvg} alt={user.name} />
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
            <Avatar className="h-8 w-8 dark:grayscale">
              <AvatarImage src={avatarSvg} alt={user.name} />
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
        <DropdownMenuSeparator />
        {menuItems.map((item) => (
          <React.Fragment key={item.label}>
            <DropdownMenuItem
              onClick={() => handleNavigation(item.path)}
            >
              <item.icon />{item.label}
            </DropdownMenuItem>
            {item.subMenu &&
              item.subMenu.map((subItem) => (
                <DropdownMenuItem
                  key={subItem.label}
                  onClick={() => handleNavigation(subItem.path)}
                  className="ml-4 pl-4 border-l-2 rounded-none"
                >
                  {subItem.label}
                </DropdownMenuItem>
              ))}
          </React.Fragment>
        ))}
        <DropdownMenuSeparator />
        {secondaryMenuItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => handleNavigation(item.path)}
          >
            <item.icon />{item.label}
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
  