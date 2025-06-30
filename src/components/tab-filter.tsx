import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type TabOption = {
  value: string
  label: string
}

type TabFilterProps = {
  options: TabOption[]
  onValueChange: (value: string) => void
  value: string
  defaultValue?: string
}

export default function TabFilter({
  options,
  onValueChange,
  value,
  defaultValue,
}: TabFilterProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      className="w-full flex-col justify-start gap-6"
      onValueChange={onValueChange}
      value={value}
    >
      <TabsList className="w-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}