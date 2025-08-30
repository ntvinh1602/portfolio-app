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
}

export default function TabSwitcher({
  options,
  onValueChange,
  value,
  defaultValue,
}: TabSwitcherProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      className="w-full flex-col justify-start gap-6"
      onValueChange={onValueChange}
      value={value}
    >
      <TabsList className="grid w-full grid-cols-4">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}