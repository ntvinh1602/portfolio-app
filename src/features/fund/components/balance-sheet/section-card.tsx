import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface BalanceSheetSectionCardProps {
  title: string
  total: number
  icon: LucideIcon
  children: ReactNode
}

export function BalanceSheetSectionCard({
  title,
  total,
  icon: Icon,
  children,
}: BalanceSheetSectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{formatNum(total)}</CardTitle>
        <CardAction>
          <Icon className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
