import type { LucideIcon } from "lucide-react"

export interface IconLabel {
  key: string
  label: string
  icon: LucideIcon
}

export interface InfoLabel {
  key: string
  label: string
  info: string
}

export type ValueLabel<TData> = {
  key: string
  label: string
  icon: LucideIcon
  getValue: (data: TData) => string | null
}
