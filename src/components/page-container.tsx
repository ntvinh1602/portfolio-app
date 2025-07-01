import * as React from "react"

import { cn } from "@/lib/utils"

export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 bg-background px-6 w-full max-w-4xl xl:mx-auto",
        className
      )}
      {...props}
    />
  )
}