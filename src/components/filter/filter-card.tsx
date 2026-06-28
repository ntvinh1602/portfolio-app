import { RotateCcw, Funnel } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"

interface FilterCardProps {
  hasFilters: boolean
  onReset: () => void
  children: React.ReactNode
}

export function FilterCard({ hasFilters, onReset, children }: FilterCardProps) {
  return (
    <Card className="h-fit w-full xl:max-w-90 mx-auto">
      <CardHeader>
        <CardTitle>Filter</CardTitle>
        <CardAction>
          <Funnel className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-5">
          {children}
          {hasFilters && (
            <Button
              variant="secondary"
              onClick={onReset}
              className="w-fit mx-auto"
            >
              <RotateCcw />
              Reset
            </Button>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
