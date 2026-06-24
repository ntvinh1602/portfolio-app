"use client"

import { useState, useEffect } from "react"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

const ALL_TIME_VALUE = 9999
const ALL_TIME_LABEL = "All Time"

export function YearPicker({
  startYear,
  endYear,
  value,
  onChange,
}: {
  startYear: number
  endYear?: number
  value?: number
  onChange?: (value: number) => void
}) {
  // Defer Date.now() to useEffect — cacheComponents requires deterministic
  // values during server render.
  const [endYearState, setEndYearState] = useState(0)
  useEffect(() => {
    setEndYearState(new Date().getFullYear())
  }, [])
  const finalEndYear = endYear ?? endYearState
  const years = Array.from(
    { length: finalEndYear - startYear + 1 },
    (_, i) => startYear + i,
  )

  const options = [ALL_TIME_VALUE, ...years.slice().reverse()]

  const formatLabel = (year: number) =>
    year === ALL_TIME_VALUE ? ALL_TIME_LABEL : year.toString()

  return (
    <NativeSelect
      value={value?.toString() ?? ""}
      onChange={(e) => {
        const v = e.target.value
        onChange?.(Number(v))
      }}
      className="w-full"
    >
      {options.map((year) => (
        <NativeSelectOption key={year} value={year.toString()}>
          {formatLabel(year)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
