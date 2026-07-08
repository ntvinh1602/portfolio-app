import { Skeleton } from "@/components/ui/skeleton"

export function AssetItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
      <Skeleton className="size-11 shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function NewsItemSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
      <div className="flex min-w-10 flex-col gap-2">
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-3 w-6" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  )
}