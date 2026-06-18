import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL_TIME_VALUE = 9999
const ALL_TIME_LABEL = "All Time"

export function YearPicker({
  startYear = 2000,
  endYear = new Date().getFullYear(),
  value,
  onChange,
}: {
  startYear?: number
  endYear?: number
  value?: number
  onChange?: (value: number) => void
}) {
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  )

  const options = [ALL_TIME_VALUE, ...years.slice().reverse()]

  const formatLabel = (year: number) =>
    year === ALL_TIME_VALUE ? ALL_TIME_LABEL : year.toString()

  return (
    <Select
      value={value?.toString() ?? ""}
      onValueChange={(v) => onChange?.(Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        {options.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {formatLabel(year)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}