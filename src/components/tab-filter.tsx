import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

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
      <Select
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        value={value}
      >
        <SelectTrigger
          className="flex w-fit @xl/main:hidden"
          id="view-selector"
        >
          <SelectValue placeholder="Select a view" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @xl/main:flex">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}