import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function StockSkeleton() {
  return (
    <Card className="rounded-full py-2 bg-background border-none shadow-none">
      <CardContent className="flex items-center gap-3 px-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-[70px]" />
              <Skeleton className="h-3 w-[120px]" />
            </div>
            <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-[80px] rounded-full" />
                <Skeleton className="h-8 w-[100px] rounded-full" />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-1 px-4">
            <Skeleton className="h-6 w-[80px] self-end" />
            <Skeleton className="h-8 w-[70px] rounded-full self-end" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}