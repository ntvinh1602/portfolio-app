import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function ItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-muted/50 p-3">
      <Skeleton className="size-11 shrink-0 rounded-2xl" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-3 w-28 rounded-md" />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
    </div>
  )
}

export default function SimpleListSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>
          {title}
        </CardTitle>
        <CardAction>
          <Skeleton className="size-9 rounded-full" />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
      </CardContent>
    </Card>
  )
}
