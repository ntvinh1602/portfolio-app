import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted/40 backdrop-blur-sm animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
