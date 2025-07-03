"use client"

import { cn } from "@/lib/utils"

export function PageMain({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "bg-background relative flex flex-1 flex-col h-full max-w-4xl mx-auto lg:rounded-xl",
        className
      )}
      {...props}
    />
  )
}