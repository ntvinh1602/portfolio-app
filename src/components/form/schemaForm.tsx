import React from "react"
import { FieldConfig } from "./field-types"
import { typeToRenderer } from "./field-registry"
import { Label } from "@/components/ui/label"

export function SchemaForm({
  id,
  blueprint,
  formState,
  onChange,
  onSubmit
}: {
  id: string
  blueprint: FieldConfig[]
  formState: Record<string, string | undefined>
  onChange: (name: string, val: string | undefined) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="flex flex-col gap-3"
    >
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
                onChange={(val) => onChange(field.name, val)}
              />
            </div>
          </div>
        )
      })}
    </form>
  )
}

