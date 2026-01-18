import {
  Group,
  GroupLabel,
  Menu,
  MenuButton,
  MenuItem,
} from "@/components/ui/sidebar"

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
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => (startYear + i).toString()
  )

  const options = ["All Time", ...years.slice().reverse()]

  return (
    <Group className="gap-2">
      <GroupLabel className="relative text-xs font-light text-gray-400 before:absolute before:left-0 before:bottom-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:drop-shadow-[0_4px_6px_rgba(251,191,36,0.4)]">
        Fiscal Year
      </GroupLabel>
      <Menu>
        {options.map((year) => {
          const isActive = value === year

          return (
            <MenuItem key={year}>
              <MenuButton
                isActive={isActive}
                size="lg"
                onClick={() => onChange?.(year)}
                className="flex items-center gap-3"
              >
                <span className="font-light">{year}</span>
              </MenuButton>
            </MenuItem>
          )
        })}
      </Menu>
    </Group>
  )
}
