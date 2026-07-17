import type { LucideIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectSeparator,
} from "@/components/ui/select"
import { Field } from "@/components/ui/field"

interface FilterSelectOption {
  key: string
  label: string
  icon?: LucideIcon
}

interface SelectAllEnabledProps {
  icon?: LucideIcon
  placeholder: string
  value: string | null
  onValueChange: (value: string | null) => void
  allLabel: string
  options: readonly FilterSelectOption[]
  disabled?: boolean
}

export function SelectAllEnabled({
  icon: Icon,
  placeholder,
  value,
  onValueChange,
  allLabel,
  options,
  disabled,
}: SelectAllEnabledProps) {
  return (
    <Field orientation="horizontal" className="min-w-50">
      <Select
        value={value ?? "all"}
        onValueChange={(v) => onValueChange(v === "all" ? null : v)}
        items={{
          all: allLabel,
          ...Object.fromEntries(options.map((o) => [o.key, o.label])),
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          {Icon && <Icon />}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectItem value="all">{allLabel}</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.icon && <option.icon />}
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

interface SingleOptionSelectProps {
  icon?: LucideIcon
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  options: readonly FilterSelectOption[]
  disabled?: boolean
}

export function SingleOptionSelect({
  icon: Icon,
  placeholder,
  value,
  onValueChange,
  options,
  disabled,
}: SingleOptionSelectProps) {
  return (
    <Field orientation="horizontal" className="min-w-50">
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onValueChange(v)
        }}
        items={Object.fromEntries(options.map((o) => [o.key, o.label]))}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          {Icon && <Icon />}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
