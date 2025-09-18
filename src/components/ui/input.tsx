import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "text-sm file:text-foreground file:h-7 file:border-0 file:bg-transparent file:text-sm font-thin file:inline-flex file:items-center placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default:
          "flex h-10 rounded-md border bg-transparent px-3 py-1 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        underline:
          "border-0 border-b focus-visible:border-b-ring focus-visible:ring-0 rounded-none px-0 py-1 aria-invalid:border-b-destructive",
      },
    },
    defaultVariants: {
      variant: "underline",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

function Input({ className, variant, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input }
