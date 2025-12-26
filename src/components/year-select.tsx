import * as Select from "@/components/ui/select"
import { Calendar } from "lucide-react"

export function YearSelect({
  startYear = 2000,
  endYear = new Date().getFullYear(),
  value,
  onChange,
}: {
  startYear?: number
  endYear?: number
  value?: string
  onChange?: (value: string) => void
}) {
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => (startYear + i).toString())

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="w-fit">
        <Calendar className="stroke-1" />
        <Select.Value placeholder="Select year" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="All Time">
          All Time
        </Select.Item>
        {years
          .slice()
          .reverse() // optional: show newest year first
          .map((year) => (
            <Select.Item key={year} value={year}>
              {year}
            </Select.Item>
          ))}
      </Select.Content>
    </Select.Root>
  )
}
