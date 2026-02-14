"use client"

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Combobox } from "@/components/combobox"

interface ComboboxFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  items: { value: string; label: string }[]
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
}

export function ComboboxField<T extends FieldValues>({
  control,
  name,
  label,
  items,
  placeholder,
  searchPlaceholder,
  emptyPlaceholder,
}: ComboboxFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel>{label}</FieldLabel>}
          <Combobox
            items={items}
            value={field.value}
            onChange={field.onChange}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyPlaceholder={emptyPlaceholder}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
