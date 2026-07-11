"use client"

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

type ComboboxOption = {
  value: string
  label: string
}

interface ComboboxFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  items: ComboboxOption[]
  placeholder?: string
  emptyPlaceholder?: string
  onSearchChange?: (value: string) => void
}

export function ComboboxField<T extends FieldValues>({
  control,
  name,
  label,
  items,
  placeholder,
  emptyPlaceholder,
  onSearchChange,
}: ComboboxFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="sr-only">{label}</FieldLabel>
          <Combobox
            items={items}
            itemToStringValue={(item: ComboboxOption) => item.label}
          >
            <ComboboxInput
              placeholder={placeholder}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="px-1"
              showClear
            />
            <ComboboxContent>
              <ComboboxEmpty>{emptyPlaceholder}</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.value} value={item.label}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
