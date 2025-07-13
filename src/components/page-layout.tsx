"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { HeaderNav } from "@/components/menu/header-nav"

interface SiteHeaderProps {
  title?: string
}

function PageHeader({ title = "Untitled" }: SiteHeaderProps) {

  return (
    <header className="flex items-center p-6 max-w-4xl xl:mx-auto w-full">
      <div className="flex w-full justify-between items-center">
        <h1 className="text-accent-foreground text-3xl font-medium">{title}</h1>
        <HeaderNav />
      </div>
    </header>
  )
}

function PageMain({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex flex-1 flex-col h-full max-w-4xl mx-auto lg:rounded-xl",
        className
      )}
      {...props}
    />
  )
}

function PageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-2 px-6 w-full max-w-4xl xl:mx-auto pb-40",
        className
      )}
      {...props}
    />
  )
}

export {
  PageMain,
  PageHeader,
  PageContent,
}