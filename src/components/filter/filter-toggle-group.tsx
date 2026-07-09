import type { LucideIcon } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Field, FieldLabel } from "@/components/ui/field"

interface FilterToggleOption {
  key: string
  label: string
  icon: LucideIcon
}

interface FilterToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  options: readonly FilterToggleOption[]
}

export function FilterToggleGroup({
  value,
  onValueChange,
  options,
}: FilterToggleGroupProps) {
  return (
    <Field orientation="horizontal" className="w-full">
      <FieldLabel className="sr-only">Category</FieldLabel>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        variant="default"
        spacing={1}
        className="flex w-full justify-start overflow-x-auto md:inline-flex md:w-fit md:max-w-full"
      >
        {options.map((option) => {
          const OptionIcon = option.icon
          return (
            <ToggleGroupItem
              key={option.key}
              value={option.key}
              className="flex-1 px-6 rounded-none data-[state=on]:bg-muted/0 data-[state=on]:border-foreground data-[state=on]:border-b hover:bg-muted/0 text-muted-foreground data-[state=on]:text-foreground md:flex-none"
            >
              <OptionIcon />
              {option.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </Field>
  )
}
