"use client"

import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

interface NumberFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  placeholder?: string
  suffix?: string
  disabled?: boolean
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  suffix,
  disabled,
}: NumberFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel className="sr-only">{label}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              type="number"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              inputMode="decimal"
              placeholder={placeholder}
              disabled={disabled}
            />
            {suffix && (
              <InputGroupAddon align="inline-end">
                <InputGroupText className="text-nowrap">
                  {suffix}
                </InputGroupText>
              </InputGroupAddon>
            )}
          </InputGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
