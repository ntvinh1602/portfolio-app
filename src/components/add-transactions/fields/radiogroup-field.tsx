"use client"

import * as React from "react"
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldTitle,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  options: RadioOption[]
}

export function RadioGroupField<T extends FieldValues>({
  control,
  name,
  options,
}: RadioGroupFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex w-full"
          >
            {options.map((opt) => (
              <FieldLabel htmlFor={`${name}-${opt.value}`} key={opt.value}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{opt.label}</FieldTitle>
                    {opt.description && (
                      <FieldDescription>{opt.description}</FieldDescription>
                    )}
                  </FieldContent>
                  <RadioGroupItem
                    value={opt.value}
                    id={`${name}-${opt.value}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
            
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
