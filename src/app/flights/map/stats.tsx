import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

export function SingleStats({
  title,
  figure,
  icon: Icon
}: {
  title: string
  figure: number
  icon: LucideIcon
}) {

  return (
    <Card className="relative flex-1 flex-col gap-0
      backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] 
      before:content-[''] 
      before:absolute 
      before:top-0 
      before:left-0 
      before:w-full 
      before:h-px 
      before:bg-gradient-to-r 
      before:from-transparent 
      before:via-ring/40 
      before:to-transparent"
    >
      <CardHeader className="flex-col gap-1 items-center">
        <CardTitle className="text-2xl font-bold text-foreground/90">
          {formatNum(figure)}
        </CardTitle>
        <CardDescription>
          {title}
        </CardDescription>
        <CardAction className="flex items-center gap-4">
          <Icon className="stroke-1" />
        </CardAction>
      </CardHeader>
    </Card>
  )
}