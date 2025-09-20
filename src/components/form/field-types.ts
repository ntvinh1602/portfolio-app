export type FieldConfig = {
  name: string
  label: string
  type: "input" | "select" | "combobox" | "datepicker"
  placeholder?: string
  inputMode?: string
  options?: {
    value: string
    label: string
  }[]
  component?: React.FC<any>
  parser?: (value: string | undefined) => any
  format?: (value: any) => string | undefined
}