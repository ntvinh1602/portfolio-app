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
  House,
  Sprout,
  Gauge,
  Wrench,
  FileQuestion,
  Coins,
  LogOut,
  Menu,
  User,
  TrendingUp,
  TrendingDown,
  HandCoins,
  Wallet
} from "lucide-react"
   
export function HeaderNav() {
  const [user, setUser] = React.useState({
    name: "Anonymous",
    email: "",
    avatar: "",
  })

  const router = useRouter()

  const menuItems = [
    { icon: House, label: "Home", path: "/" },
    {
      icon: Sprout,
      label: "Assets",
      path: "/assets",
      subMenu: [
        { icon: Wallet, label: "Holdings", path: "/assets/holdings" },
        { icon: HandCoins, label: "Debts", path: "/assets/debts" },
      ],
    },
    { icon: Coins, label: "Transaction", path: "/transactions" },
    { icon: Gauge,
      label: "Analytics",
      path: "/analytics",
      subMenu: [
        { icon: TrendingUp, label: "Earnings", path: "/analytics/earnings" },
        { icon: TrendingDown, label: "Expenses", path: "/analytics/expenses" },
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Menu className="size-8 text-accent-foreground"/>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-accent rounded-2xl bg-card/40 backdrop-blur-sm w-56"
      >
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <User />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-accent"/>
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
                  <subItem.icon />{subItem.label}
                </DropdownMenuItem>
              ))}
          </React.Fragment>
        ))}
        <DropdownMenuSeparator className="bg-accent"/>
        {secondaryMenuItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => handleNavigation(item.path)}
          >
            <item.icon />{item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-accent"/>
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
  