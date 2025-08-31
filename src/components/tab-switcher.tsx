import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

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
}

export default function TabSwitcher({
  options,
  onValueChange,
  value,
  defaultValue,
  border = true,
  tabClassName,
  triggerClassName
}: TabSwitcherProps) {
  return (
    <Tabs
      className={tabClassName}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      value={value}
    >
      <TabsList className={`flex ${!border && `border-0`}`}>
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className={triggerClassName}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}