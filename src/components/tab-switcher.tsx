import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Moon, Sun } from "lucide-react"

type SwitchOption = {
  value: string
  label: string
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
            {option.value === "light"
              ? <Sun/>
              : option.value === "dark" && <Moon/>}
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}