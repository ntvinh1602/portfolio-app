export type FieldConfig<K extends string = string> = {
  name: K // must match with Zod schema keys
  label: string
  type: "input" | "select" | "combobox" | "datepicker" | "checkbox"
  placeholder?: string
  inputMode?: string
  options?: {
    value: string
    label: string
  }[]
  parser?: (value: string | undefined) => any
  format?: (value: any) => string | undefined
  transform?: (value: string) => string // optional live transform
}
