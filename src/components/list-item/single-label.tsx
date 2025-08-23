import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardAction,
  CardTitle,
} from "@/components/ui/card"

interface SummaryCardProps {
  header?: boolean
  label: string
  value: string
  link?: string
}

interface SummarySkeletonProps {
  header?: boolean
  label: string
}

function SummaryCard({
  header = false,
  label,
  value,
  link
}: SummaryCardProps) {
  const router = useRouter()
  const handleNavigation = () => {
    if (link) router.push(link)
  }

  return (
    <Card className={`border-0 py-3 rounded-md ${header && "bg-muted dark:bg-muted/50"}`}>
      <CardHeader className="flex items-center justify-between">
        {link ? 
          <CardTitle
            className="flex items-center gap-1 font-thin text-sm"
            onClick={handleNavigation}
          >
            <span>{label}</span>
            <ChevronRight className="size-4 stroke-1" />
          </CardTitle> :
          <span className="font-thin text-sm">{label}</span>
        }
        <CardAction className="font-thin text-sm">{value}</CardAction>
      </CardHeader>
    </Card>
  )
}

function SummarySkeleton({ header = false, label }: SummarySkeletonProps) {
  return (
    <Button
      variant={header ? "secondary" : "ghost"}
      className={cn(
        "flex w-full justify-between disabled:opacity-100",
        header && "bg-primary/80 border text-background border-primary/50 mt-2",
      )}
      disabled
    >
      <span>{label}</span>
      <Skeleton className="h-5 w-32" />
    </Button>
  )
}

export {
  SummaryCard,
  SummarySkeleton
}