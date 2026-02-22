import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { Card, CardHeader, CardAction } from "@/components/ui/card"
import { formatNum } from "@/lib/utils"

interface BSItemProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: boolean
  label: string
  value?: number
  className?: string
  children?: React.ReactNode
  open?: boolean
  collapsible?: boolean
}

export function BSItem({
  header = false,
  label,
  value,
  className,
  children,
  open = true,
  collapsible = false,
  ...props
}: BSItemProps) {
  return (
    <Card
      className={`border-0 py-3 rounded-md transition-colors ${
        header
          ? "rounded-full text-primary border-0 bg-gradient-to-r from-ring/10 to-transparent backdrop-blur-sm before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/50 before:to-transparent"
          : "bg-transparent shadow-none"
      } ${className}`}
      {...props}
    >
      <CardHeader className="flex px-4 justify-between items-center select-none">
        <div className="flex items-center gap-2">
          {collapsible && (
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </motion.div>
          )}
          <span
            className={`text-sm ${
              header ? "font-light" : "font-thin"
            } capitalize`}
          >
            {label}
          </span>
        </div>
        <CardAction
          className={`${header ? "font-light" : "font-thin"} text-sm`}
        >
          {value ? formatNum(value) : 0}
        </CardAction>
      </CardHeader>

      <AnimatePresence initial={false}>
        {open && children && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="ml-6 space-y-1 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
