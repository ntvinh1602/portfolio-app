import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SummaryCardProps {
  header?: boolean
  label: string
  value: string
}

export function SummaryCard({
  header = false,
  label,
  value,
}: SummaryCardProps) {
  return (
    <Button
      variant={header ? "secondary" : "ghost"}
      className={cn(
        "flex w-full justify-between",
        !header && "font-normal",
        header && "text-foreground mt-2",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </Button>
  )
}