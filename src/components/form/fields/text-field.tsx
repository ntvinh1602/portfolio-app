"use client"

import { Input } from "@/components/ui/input"
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

interface TextFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  placeholder?: string
  disabled?: boolean
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
}: TextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          {label && <FieldLabel>{label}</FieldLabel>}
          <Input
            type="text"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            inputMode="text"
            placeholder={placeholder}
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}