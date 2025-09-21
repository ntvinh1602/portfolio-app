import React from "react"
import { FieldConfig } from "./field-types"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SingleDate } from "@/components/date-picker"
import { Combobox } from "@/components/combobox"
import { Checkbox } from "@/components/ui/checkbox"

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
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const dateValue = value ? new Date(value) : undefined;
  return (
    <SingleDate
      selected={dateValue}
      onSelect={(date) => onChange(date?.toISOString())}
      dateFormat="iiii, dd MMMM yyyy"
    />
  );
};

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