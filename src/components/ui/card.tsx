import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  variant?: "normal" | "glow" | "highlight"
}

function Card({
  className,
  variant = "normal",
  ...props
}: CardProps) {
  const baseStyles =
    "relative bg-card/0 text-card-foreground flex flex-col gap-6 border py-6"

  const variantStyles = {
    normal: "rounded-md",
    glow: "rounded-2xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent before:rounded-t-2xl",
    highlight: "rounded-md before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/50 before:to-transparent before:rounded-full",
  }[variant]

  return (
    <div
      data-slot="card"
      className={cn(baseStyles, variantStyles, className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-foreground leading-none font-thin", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm font-light", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card as Root,
  CardHeader as Header,
  CardFooter as Footer,
  CardTitle as Title,
  CardAction as Action,
  CardDescription as Subtitle,
  CardContent as Content,
}
