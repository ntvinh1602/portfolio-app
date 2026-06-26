import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "../ui/button"
import { Calendar } from "lucide-react"

export default function YearSwitcherSkeleton() {
  return (
    <div className="flex w-full items-center gap-2 rounded-4xl bg-card p-1">
      <Button variant="ghost" size="icon-lg" className="pointer-events-none">
        <Calendar />
      </Button>
      <div className="flex w-full gap-1 p-1">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
      </div>
    </div>
  )
}
