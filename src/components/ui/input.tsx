import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "text-sm file:text-foreground file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-thin file:inline-flex placeholder:text-muted-foreground placeholder: font-thin selection:bg-primary selection:text-primary-foreground dark:bg-card/40 flex h-10 w-full min-w-0 rounded-full border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none  disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
