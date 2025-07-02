import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SummarySkeletonProps {
  header?: boolean
}

export function SummarySkeleton({ header = false }: SummarySkeletonProps) {
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