import { Card, CardHeader, CardAction } from "@/components/ui/card"
import { formatNum } from "@/lib/utils"

interface BSItemProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: boolean
  label: string
  value?: number
  className?: string
  children?: React.ReactNode
}

export function BSItem({
  header = false,
  label,
  value,
  className,
  children,
  ...props
}: BSItemProps) {
  return (
    <Card
      className={`border-0 py-3 gap-2 rounded-md transition-colors ${
        header
          ? "rounded-full text-primary border-0 bg-gradient-to-r from-ring/10 to-transparent backdrop-blur-sm before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/50 before:to-transparent"
          : "bg-transparent shadow-none"
      } ${className}`}
      {...props}
    >
      <CardHeader className="flex px-4 justify-between items-center select-none">
        <span className={`${header ? "font-normal" : "font-thin"} capitalize`}>
          {label}
        </span>
        <CardAction className={`${header ? "font-light" : "font-thin"} text-base`}>
          {value ? formatNum(value) : 0}
        </CardAction>
      </CardHeader>

      {children && (
        <div className="ml-4 pl-4 pb-4 border-b">
          {children}
        </div>
      )}
    </Card>
  )
}