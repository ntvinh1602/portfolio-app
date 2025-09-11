import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

type SwitchOption = {
  value: string
  label: string
  icon?: React.ElementType
  number?: number
}

type TabSwitcherProps = {
  options: SwitchOption[]
  onValueChange: (value: string) => void
  value: string
  defaultValue?: string
  border?: boolean
  tabClassName?: string
  triggerClassName?: string
  indicatorClassName?: string
}

export function TabSwitcher({
  options,
  onValueChange,
  value,
  defaultValue,
  border = true,
  tabClassName,
  triggerClassName,
  indicatorClassName
}: TabSwitcherProps) {
  return (
    <Tabs
      className={tabClassName}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      value={value}
    >
      <TabsList
        className={`flex ${!border && `border-0`}`}
        indicatorClassName={indicatorClassName}
      >
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className={triggerClassName}
          >
            {option.icon && <option.icon />}
            {option.label}
            {option.number !== undefined && option.number > 0 && (
              <Badge variant="outline">{option.number}</Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}