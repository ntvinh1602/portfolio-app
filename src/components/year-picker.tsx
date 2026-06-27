import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { Field, FieldLabel } from "./ui/field"

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
  const endYearState = new Date().getFullYear()
  const finalEndYear = endYear ?? endYearState
  const years = Array.from(
    { length: finalEndYear - startYear + 1 },
    (_, i) => startYear + i,
  ).reverse()

  return (
    <Field orientation="horizontal">
      <FieldLabel>
        <Calendar className="stroke-1 size-5" />
      </FieldLabel>
      <Select
        value={value?.toString()}
        onValueChange={(v) => onChange?.(Number(v))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            <SelectItem value="9999">All Years</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Only in...</SelectLabel>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year.toString()}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
