import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Variant = "content" | "switch"

type TabSwitcherProps = {
  options: {
    value: string
    label: string
    icon?: React.ElementType
    number?: number
    customBadge?: React.ReactNode
  }[]
  onValueChange: (value: string) => void
  value: string
  defaultValue?: string
  variant?: Variant
  tabClassName?: string
  triggerClassName?: string
  indicatorClassName?: string
}

const variantStyles: Record<
  Variant,
  {
    tab: string
    trigger: string
    indicator: string
    list: string
  }
> = {
  content: {
    tab: "ml-auto",

    // Trigger — inspired by menu button default
    trigger: [
      "relative flex items-center justify-center px-3 py-2 text-sm font-light select-none",
      "transition-all duration-300 ease-out",
      "text-muted-foreground rounded-none outline-hidden",

      // Hover background gradient — bottom to top fade
      "hover:bg-gradient-to-t hover:from-amber-400/15 hover:to-transparent",

      // Bottom luminous glow
      "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full",
      "after:bg-amber-400 after:opacity-0 hover:after:opacity-100",
      "hover:after:bg-foreground",
      "after:transition-opacity after:duration-300",
      "after:shadow-[0_0_10px_2px_rgba(251,191,36,0.6)]",

      // Active state — amber text + full bottom glow + background gradient
      "data-[state=active]:text-amber-300",
      "data-[state=active]:after:opacity-100",
      "data-[state=active]:bg-gradient-to-t data-[state=active]:from-amber-500/20 data-[state=active]:to-transparent",

      // Focus & hover transitions
      "hover:text-foreground focus-visible:ring-1 focus-visible:ring-amber-400/30 focus-visible:ring-offset-0",
    ].join(" "),

    // Indicator — optional, can be used for extra bottom border glow
    indicator:
      "border-b-2 border-amber-400/70 rounded-none transition-all duration-300",

    // List — neutral container
    list: [
      "flex border-0 bg-transparent",
      "backdrop-blur-sm",
      "border-b-2 rounded-none"  // muted white bottom border
    ].join(" "),
  },

  switch: {
    tab: "ml-auto",
    trigger:
      "w-30 data-[state=active]:text-primary data-[state=active]:font-normal hover:text-white hover:font-normal",
    indicator:
      "rounded-2xl bg-primary/15 shadow-[inset_0_0_10px_oklch(from_var(--primary)_l_c_h_/0.15)]",
    list:
      "flex gap-1 p-0 rounded-2xl backdrop-blur-md border shadow-[inset_0_0_10px_oklch(from_var(--foreground)_l_c_h_/0.1)]",
  },
}


export function TabSwitcher({
  options,
  onValueChange,
  value,
  defaultValue,
  variant = "content",
  tabClassName,
  triggerClassName,
  indicatorClassName
}: TabSwitcherProps) {
  const styles = variantStyles[variant]

  return (
    <Tabs
      className={cn(styles.tab, tabClassName)}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      value={value}
    >
      <TabsList
        className={cn(styles.list)}
        indicatorClassName={cn(styles.indicator, indicatorClassName)}
      >
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className={cn(styles.trigger, triggerClassName)}
          >
            {option.customBadge && option.customBadge}
            {option.icon && <option.icon />}
            {option.label}
            {option.number !== undefined && option.number > 0 && (
              <Badge variant={value === option.value ? "default" : "outline"}>
                {option.number}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
