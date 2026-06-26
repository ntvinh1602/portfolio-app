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
    <div className="flex items-start gap-3 rounded-3xl bg-muted/50 p-3">
      <div className="flex min-w-10 flex-col gap-2">
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-3 w-6 rounded-md" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-4/5 rounded-md" />
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-2/5 rounded-md" />
      </div>
    </div>
  )
}

export default function DetailedListSkeleton({ title }: { title: string }) {
  return (
    <Card className="h-120">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Skeleton className="h-9 w-56 rounded-3xl" />
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
      </CardContent>
    </Card>
  )
}
