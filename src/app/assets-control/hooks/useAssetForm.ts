import * as React from "react"
import { Tables } from "@/types/database.types"

export function useAssetForm<T extends Partial<Tables<"assets">>>(
  initialData: T,
  onSubmit: (data: T) => Promise<void> | void,
  enableReset: boolean
) {
  const [formData, setFormData] = React.useState<T>(initialData)

  React.useEffect(() => {
    if (enableReset) {
      setFormData(initialData)
    }
  }, [initialData, enableReset])

  const handleChange = <K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return { formData, handleChange, handleSubmit }
}

