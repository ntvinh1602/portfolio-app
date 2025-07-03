import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface SummaryCardProps {
  header?: boolean
  label: string
  value: string
}

interface SummarySkeletonProps {
  header?: boolean
}

function SummaryCard({
  header = false,
  label,
  value,
}: SummaryCardProps) {
  return (
    <Button
      variant={header ? "secondary" : "ghost"}
      className={cn(
        "flex w-full justify-between",
        !header && "font-normal",
        header && "text-foreground mt-2",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </Button>
  )
}

function SummarySkeleton({ header = false }: SummarySkeletonProps) {
  return (
    <Button
      variant={header ? "secondary" : "ghost"}
      className={cn(
        "flex w-full justify-between",
        !header && "font-normal",
        header && "text-foreground mt-2",
      )}
      disabled
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-32" />
    </Button>
  )
}

export {
  SummaryCard,
  SummarySkeleton
}