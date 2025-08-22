import { cn } from "@/lib/utils"
import { MobileHeader } from "@/components/header"

interface SiteHeaderProps {
  title?: string
}

function PageHeader({ title = "Untitled" }: SiteHeaderProps) {

  return (
    <header className="flex items-center p-6 w-full">
      <div className="flex w-full justify-between items-center">
        <h1 className="text-3xl font-regular">{title}</h1>
        <MobileHeader />
      </div>
    </header>
  )
}

function PageMain({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex flex-1 flex-col h-full max-w-6xl mx-auto lg:rounded-xl",
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
        "flex flex-1 flex-col gap-2 px-6 w-full pb-40",
        className
      )}
      {...props}
    />
  )
}

export {
  PageMain,
  PageHeader,
  PageContent
}