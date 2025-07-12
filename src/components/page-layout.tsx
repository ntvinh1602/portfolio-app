"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { HeaderNav } from "@/components/menu/header-nav"

function PageContent({ className, ...props }: React.ComponentProps<"div">) {
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

interface SiteHeaderProps {
  title?: string
}

function PageHeader({ title = "Untitled" }: SiteHeaderProps) {

  return (
    <header className="flex items-center p-6 max-w-4xl xl:mx-auto w-full">
      <div className="flex w-full justify-between items-center">
        <h1 className="text-3xl font-medium">{title}</h1>
        <HeaderNav />
      </div>
    </header>
  )
}

function PageMain({ className, ...props }: React.ComponentProps<"main">) {
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

export {
  PageMain,
  PageHeader,
  PageContent,
}