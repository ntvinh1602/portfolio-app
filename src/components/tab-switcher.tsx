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
    trigger:
      "w-30 border-b rounded-none data-[state=active]:border-primary data-[state=active]:text-primary text-md",
    indicator: "bg-none",
    list: "flex border-0",
  },
  switch: {
    tab: "flex flex-col justify-center",
    trigger:
      "px-3 py-1 text-sm rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground",
    indicator: "hidden",
    list: "flex border-0",
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
  indicatorClassName,
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
