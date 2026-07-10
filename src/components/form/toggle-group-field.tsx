"use client"

import type { LucideIcon } from "lucide-react"
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface ToggleOption {
  key: string
  label: string
  icon?: LucideIcon
}

interface ToggleGroupFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  options: ToggleOption[]
  disabled?: boolean
}

export function ToggleGroupField<T extends FieldValues>({
  control,
  name,
  options,
  disabled,
}: ToggleGroupFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel className="sr-only">{name}</FieldLabel>
          <ToggleGroup
            type="single"
            value={field.value ?? ""}
            onValueChange={(value) => {
              if (value) field.onChange(value)
            }}
            variant="outline"
            disabled={disabled}
            spacing={0}
            className="w-full"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option.key}
                value={option.key}
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.icon && <option.icon />}
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
