"use client"

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldTitle,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { InfoLabel } from "@/types/global.types"

const columnClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
}

interface RadioGroupFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  options: InfoLabel[]
  column: number
}

export function RadioGroupField<T extends FieldValues>({
  control,
  name,
  options,
  column,
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
            className={columnClasses[column] ?? "grid-cols-1"}
          >
            {options.map((opt) => (
              <FieldLabel
                htmlFor={`${name}-${opt.key}`}
                key={opt.key}
                className="border-border"
              >
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{opt.label}</FieldTitle>
                    <FieldDescription>{opt.info}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem
                    value={opt.key}
                    id={`${name}-${opt.key}`}
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
