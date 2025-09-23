import * as TT from "@/components/ui/tooltip"
import * as Card from "@/components/ui/card"
import * as Sheet from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AssetItem } from "../types/dashboard-data"
import { useLiveData } from "../context/live-data-context"
import { PanelRightOpen } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatNum } from "@/lib/utils"
import { Loading } from "@/components/loader"

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
      className={`border-0 py-3 rounded-md ${header && "bg-muted"} ${className}`}
      {...props}
    >
      <Card.Header className="flex px-4 justify-between">
        <span className="text-sm font-thin">{label}</span>
        <Card.Action className="font-thin text-sm">
          {value ? formatNum(value) : 0}
        </Card.Action>
      </Card.Header>
    </Card.Root>
  )
}

export function BalanceSheet() {
  const {
    balanceSheet: bs,
    loading
  } = useLiveData()
  const isMobile = useIsMobile()

  if (loading || !bs) return <Loading/>

  return (
    <Sheet.Root>
      <TT.Root>
        <TT.Trigger asChild>
          <Sheet.Trigger asChild>
            <Button variant="ghost" size="sm">
              <PanelRightOpen />
            </Button>
          </Sheet.Trigger>
        </TT.Trigger>
        <TT.Content>
          View balance sheet
        </TT.Content>
      </TT.Root>
      <Sheet.Content side={isMobile ? "bottom" : "right"}>
        <Sheet.Header>
          <Sheet.Title className="font-light text-xl">
            Balance Sheet
          </Sheet.Title>
          <Sheet.Subtitle className="font-light">
            Summary of fund assets by its origins and allocation
          </Sheet.Subtitle>
        </Sheet.Header>
        <Card.Root className="h-fit gap-3 border-0 py-0">
          <Card.Content className="flex flex-col gap-2">
            <Card.Subtitle>Total Assets</Card.Subtitle>
            <div className="flex flex-col">
              <BSItem header label="Assets" value={bs.totalAssets}/>
              {bs.assets.map((item: AssetItem) => (
                <BSItem key={item.type} label={item.type} value={item.totalAmount}/>
              ))}
            </div>

            <Separator className="mt-2 mb-4" />

            <Card.Subtitle>Total Liabilities</Card.Subtitle>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <BSItem header label="Liabilities" value={bs.totalLiabilities}/>
                {bs.liabilities.map((item: AssetItem) => (
                  <BSItem key={item.type} label={item.type} value={item.totalAmount}/>
                ))}
              </div>
              <div className="flex flex-col">
                <BSItem header label="Equities" value={bs.totalEquity}/>
                {bs.equity.map((item: AssetItem) => (
                  <BSItem key={item.type} label={item.type} value={item.totalAmount}/>
                ))}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
        <Sheet.Footer>
          <Sheet.Close asChild>
            <Button variant="outline">Close</Button>
          </Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  )
}
