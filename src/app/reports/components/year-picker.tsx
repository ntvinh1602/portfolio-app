import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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
    <SidebarGroup className="gap-2 w-30 shrink-0">
      <SidebarGroupLabel className="relative text-xs font-light text-gray-400 before:absolute before:left-0 before:bottom-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:drop-shadow-[0_4px_6px_rgba(251,191,36,0.4)]">
        Fiscal Year
      </SidebarGroupLabel>

      <SidebarMenu>
        {options.map((year) => {
          const isActive = value === year

          return (
            <SidebarMenuItem key={year}>
              <SidebarMenuButton
                isActive={isActive}
                size="lg"
                onClick={() => onChange?.(year)}
                className="flex items-center gap-3"
              >
                <span className="font-light">
                  {formatLabel(year)}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}