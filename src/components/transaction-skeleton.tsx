import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function TransactionSkeleton() {
  return (
    <Card className="gap-1 py-0 border-none bg-background shadow-none">
      <Skeleton className="h-5 w-24" />
      <CardContent className="flex items-center border-t py-2 px-0 gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex flex-col w-full min-w-0 gap-1">
          <div className="flex flex-1 justify-between min-w-0">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-1/6" />
          </div>
          <div className="flex flex-1 justify-between min-w-0 items-end">
            <div className="flex gap-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-1/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}