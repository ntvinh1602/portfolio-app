import type { LucideIcon } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Field, FieldLabel } from "@/components/ui/field"

interface FilterToggleOption {
  key: string
  label: string
  icon: LucideIcon
}

interface FilterToggleGroupProps {
  icon: LucideIcon
  value: string[]
  onValueChange: (value: string[]) => void
  options: readonly FilterToggleOption[]
}

export function FilterToggleGroup({
  icon: Icon,
  value,
  onValueChange,
  options,
}: FilterToggleGroupProps) {
  return (
    <Field orientation="horizontal">
      <FieldLabel>
        <Icon className="stroke-1 size-5" />
      </FieldLabel>
      <ToggleGroup
        type="multiple"
        value={value}
        onValueChange={onValueChange}
        variant="outline"
        spacing={0}
        className="w-full"
      >
        {options.map((option) => {
          const OptionIcon = option.icon
          return (
            <ToggleGroupItem
              key={option.key}
              value={option.key}
              className="rounded-xl px-3 text-xs flex-1"
            >
              <OptionIcon className="size-3.5" />
              {option.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </Field>
  )
}
