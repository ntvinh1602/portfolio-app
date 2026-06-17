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