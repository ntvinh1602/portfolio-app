import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

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
    <Button
      variant={header ? "secondary" : "ghost"}
      className={cn(
        "flex w-full justify-between font-thin text-foreground",
        header && "bg-secondary dark:bg-primary/80 border text-background border-primary/50 mt-2",
      )}
    >
      {
        link
          ? <div
              className="flex items-center gap-1"
              onClick={handleNavigation}
            >
              <span>{label}</span>
              <ChevronRight className="size-4" />
            </div>
          : <span>{label}</span>
      }
      <span>{value}</span>
    </Button>
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