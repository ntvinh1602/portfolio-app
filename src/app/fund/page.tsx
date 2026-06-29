import Link from "next/link"
import { ArrowLeftRight, CalendarRange, LayoutDashboard } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const pages = [
  {
    href: "/fund/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Fund performance overview",
    body: "View equity charts, returns, portfolio holdings, PnL metrics, news, and TradingView charts.",
  },
  {
    href: "/fund/transactions",
    icon: ArrowLeftRight,
    title: "Events",
    description: "Event ledger and entry forms",
    body: "Browse, filter, and search transaction history. Record stock trades, cashflow, borrow, and repay events.",
  },
  {
    href: "/fund/performance",
    icon: CalendarRange,
    title: "Performance",
    description: "Year-over-year retrospective",
    body: "Review yearly PnL, returns, top-performing stocks, and cashflow summaries per fiscal year.",
  },
]

export default function FundPage() {
  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 mx-auto">
        {pages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="h-full transition-colors hover:bg-accent max-w-120">
              <CardHeader>
                <CardAction>
                  <page.icon className="stroke-1" />
                </CardAction>
                <CardTitle>{page.title}</CardTitle>
                <CardDescription>{page.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{page.body}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
