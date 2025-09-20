import { Label } from "@/components/ui/label"

export function FormRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="h-9 grid grid-cols-4 items-center text-end gap-2">
      <Label>{label}</Label>
      <div className="col-span-3 text-start">{children}</div>
    </div>
  )
}