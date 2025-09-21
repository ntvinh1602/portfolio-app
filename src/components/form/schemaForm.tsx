import React from "react"
import { FieldConfig } from "./field-types"
import { typeToRenderer } from "./field-registry"
import { Label } from "@/components/ui/label"

export type SchemaFormProps<T extends Record<string, string | undefined>> = {
  blueprint: FieldConfig<string>[]
  formState: Partial<Record<keyof T & string, string | undefined>>
  onChange: <K extends keyof T & string>(name: K, val: string | undefined) => void
}

export function SchemaForm<T extends Record<string, string | undefined>>({
  blueprint,
  formState,
  onChange,
}: SchemaFormProps<T>) {
  return (
    <div className="flex flex-col gap-3">
      {blueprint.map((field) => {
        const Renderer = typeToRenderer[field.type]
        if (!Renderer) {
          console.warn(`No renderer found for field type: ${field.type}`)
          return null
        }

        return (
          <div key={field.name} className="h-9 grid grid-cols-4 items-center">
            <Label>{field.label}</Label>
            <div className="col-span-3 text-start">
              <Renderer
                field={field}
                value={formState[field.name]}
                onChange={(val) => {
                  const transformed =
                    val && field.transform ? field.transform(val) : val
                  onChange(field.name, transformed)
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
