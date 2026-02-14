import React, { useState } from "react"
import { Calendar1 } from "lucide-react"
import { FieldConfig } from "./field-types"
import { format } from "date-fns"
import { Combobox } from "@/components/combobox"

import * as Select from "@/components/ui/select"
import * as Popover from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"

interface FieldRendererProps<T extends string | number | boolean | Date | undefined> {
  field: FieldConfig
  value: T
  onChange: (value: T) => void
}

const InputField: React.FC<FieldRendererProps<string | undefined>> = ({ field, value, onChange }) => (
  <Input
    type={field.inputMode}
    placeholder={field.placeholder}
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    className={field.inputMode === "number" ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""}
  />
)

const SelectField: React.FC<FieldRendererProps<string | undefined>> = ({ field, value, onChange }) => {

  return (
    <Select.Root onValueChange={onChange} value={value}>
      <Select.Trigger className="w-full">
        <Select.Value placeholder={field.placeholder} />
      </Select.Trigger>
      <Select.Content>
        {field.options?.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

const ComboboxField: React.FC<FieldRendererProps<string | undefined>> = ({ field, value, onChange }) => {

  return (
    <Combobox
      items={field.options ? field.options : []}
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
    />
  )
}

const DateField: React.FC<FieldRendererProps<string | undefined>> = ({ value, onChange }) => {
  const dateValue = value ? new Date(value) : undefined
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          id="dates"
          variant="outline"
          className="w-full has-[>svg]:px-0 justify-between"
        >
          {dateValue ? format(dateValue, "iiii, dd MMMM yyyy") : "Select date"}
          <Calendar1 className="stroke-1 size-4" />
        </Button>
      </Popover.Trigger>
      <Popover.Content
        className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
        align="start"
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          numberOfMonths={1}
          defaultMonth={dateValue}
          weekStartsOn={1}
          startMonth={new Date(2021, 1)}
          disabled={{
            before: new Date(2021, 11, 1),
            dayOfWeek: [0, 6]
          }}
          selected={dateValue}
          onSelect={(value) => {
            onChange(value ? format(value, "iiii, dd MMMM yyyy") : undefined)
            setOpen(false)
          }}
        />
      </Popover.Content>
    </Popover.Root>
  )
}

const CheckboxField: React.FC<FieldRendererProps<string | undefined>> = ({ value, onChange }) => (
  <Checkbox
    checked={value === "true"}
    onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
  />
)


export const typeToRenderer: Record<string, React.FC<FieldRendererProps<string | undefined>>> = {
  input: InputField,
  select: SelectField,
  combobox: ComboboxField,
  datepicker: DateField,
  checkbox: CheckboxField
}