import { Skeleton } from "@/components/ui/skeleton"

export function AssetItemSkeleton() {
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

export function NewsItemSkeleton() {
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