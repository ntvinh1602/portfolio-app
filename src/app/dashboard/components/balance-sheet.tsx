import * as Card from "@/components/ui/card"
import * as Popover from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { PanelRightOpen } from "lucide-react"
import { formatNum } from "@/lib/utils"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"

interface BSItemProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: boolean
  label: string
  value?: number
  className?: string
}

function BSItem({
  header = false,
  label,
  value,
  className,
  ...props
}: BSItemProps) {
  return (
    <Card.Root
      variant={header ? "highlight" : "normal"}
      className={`border-0 py-3 rounded-md ${
        header ? "rounded-full text-primary" : ""
      } ${className}`}
      {...props}
    >
      <Card.Header className="flex px-4 justify-between">
        <span className={`text-sm ${header ? "font-light" : "font-thin"}`}>
          {label}
        </span>
        <Card.Action
          className={`${header ? "font-light" : "font-thin"} text-sm`}
        >
          {value ? formatNum(value) : 0}
        </Card.Action>
      </Card.Header>
    </Card.Root>
  )
}

export function BalanceSheet() {
  const { balanceSheet: bsData } = useBalanceSheetData() // now a flat array from Supabase view

  // Safety guard for undefined data
  const data = Array.isArray(bsData) ? bsData : []

  // Group rows by type
  const assets = data.filter((r) => r.type === "asset")
  const liabilities = data.filter((r) => r.type === "liability")
  const equities = data.filter((r) => r.type === "equity")

  // Calculate totals
  const totalAssets = assets.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalLiabilities = liabilities.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalEquity = equities.reduce((sum, r) => sum + (r.amount || 0), 0)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative flex items-center justify-center p-2 rounded-xl transition-colors hover:bg-muted"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      </Popover.Trigger>

      <Popover.Content
        align="end"
        className="rounded-2xl bg-background/80 backdrop-blur-sm w-auto max-w-[90vw] max-h-[80vh] overflow-y-auto"
      >
        <Card.Root className="flex flex-row px-2 py-4 border-0 bg-transparent">
          {/* Assets */}
          <div className="flex flex-col min-w-[300px]">
            <Card.Header className="pb-4 justify-center text-xl font-thin">
              Total Assets
            </Card.Header>
            <BSItem header label="Assets" value={totalAssets} />
            {assets.map((item) => (
              <BSItem
                key={item.account}
                label={item.account ?? "-"}
                value={item.amount ?? 0}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="relative flex items-center">
            <div
              className="
                relative w-[1px] h-full rounded-full
                bg-gradient-to-b from-transparent via-ring/70 to-transparent
              "
            />
          </div>

          {/* Liabilities & Equity */}
          <div className="flex flex-col gap-4 min-w-[300px]">
            {/* Liabilities */}
            <div className="flex flex-col">
              <Card.Header className="pb-4 justify-center text-xl font-thin">
                Total Liabilities
              </Card.Header>
              <BSItem header label="Liabilities" value={totalLiabilities} />
              {liabilities.map((item) => (
                <BSItem
                  key={item.account}
                  label={item.account ?? "-"}
                  value={item.amount ?? 0}
                />
              ))}
            </div>

            {/* Equity */}
            <div>
              <BSItem header label="Equity" value={totalEquity} />
              {equities.map((item) => (
                <BSItem
                  key={item.account}
                  label={item.account ?? "-"}
                  value={item.amount ?? 0}
                />
              ))}
            </div>
          </div>
        </Card.Root>
      </Popover.Content>
    </Popover.Root>
  )
}
