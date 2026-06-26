import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface PieChartCardSkeletonProps {
  title: string
}

export default function PieChartCardSkeleton({
  title,
}: PieChartCardSkeletonProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle>
          <Skeleton className="h-6 w-28 rounded-md sm:h-7 sm:w-36" />
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex w-full items-center gap-4">
          <Skeleton className="aspect-square w-full max-w-24 shrink-0 rounded-full" />

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-3 w-18 rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
