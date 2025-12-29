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
      <Select.Trigger className="px-4 w-full border rounded-2xl h-12 text-lg focus-visible:hidden backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent before:rounded-t-2xl hover:bg-primary/20 hover:text-primary hover:shadow-[inset_0_0_10px_oklch(from_var(--primary)_l_c_h_/0.3)]">
        <Calendar className="size-5 stroke-1 hover:text-primary" />
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="All Time" className="justify-center">
          All Time
        </Select.Item>
        {years
          .slice()
          .reverse() // optional: show newest year first
          .map((year) => (
            <Select.Item key={year} value={year} className="justify-center">
              {year}
            </Select.Item>
          ))}
      </Select.Content>
    </Select.Root>
  )
}
