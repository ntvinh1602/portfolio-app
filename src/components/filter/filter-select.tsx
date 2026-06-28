import type { LucideIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"

interface FilterSelectOption {
  key: string
  label: string
  icon?: LucideIcon
}

interface FilterSelectProps {
  icon: LucideIcon
  placeholder: string
  value: string | null
  onValueChange: (value: string | null) => void
  allLabel: string
  groupLabel: string
  options: FilterSelectOption[]
}

export function FilterSelect({
  icon: Icon,
  placeholder,
  value,
  onValueChange,
  allLabel,
  groupLabel,
  options,
}: FilterSelectProps) {
  return (
    <Field orientation="horizontal">
      <FieldLabel>
        <Icon className="stroke-1 size-5" />
      </FieldLabel>
      <Select
        value={value ?? "all"}
        onValueChange={(v) => onValueChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            <SelectItem value="all">{allLabel}</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{groupLabel}</SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.icon ? (
                  <span className="flex items-center gap-2">
                    <option.icon className="size-3.5" />
                    {option.label}
                  </span>
                ) : (
                  option.label
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
