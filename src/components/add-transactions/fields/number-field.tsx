"use client"

import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group"
import { formatNumber, parseNumber } from "@/lib/utils"
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
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
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel>{label}</FieldLabel>}
          <InputGroup className="border-0">
            <Input
              type="text"
              value={formatNumber(field.value)}
              onChange={(e) => field.onChange(parseNumber(e.target.value))}
              inputMode="decimal"
              placeholder={placeholder}
              disabled={disabled}
            />
            {suffix && (
              <InputGroupAddon align="inline-end">
                <InputGroupText>{suffix}</InputGroupText>
              </InputGroupAddon>
            )}
          </InputGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}