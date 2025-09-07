import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { ChevronRight } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardAction,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatNum } from "@/lib/utils"
import { AssetItem } from "@/types/dashboard-data"
import { useAssetData } from "@/context/asset-data-context"
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
    <Card
      className={`border-0 py-3 rounded-md ${header && "bg-muted"} ${className}`}
      {...props}
    >
      <CardHeader className="flex px-4 justify-between">
        <span className="text-sm font-thin">{label}</span>
        <CardAction className="font-thin text-sm">
          {value ? formatNum(value) : 0}
        </CardAction>
      </CardHeader>
    </Card>
  )
}

export function BalanceSheet() {
  const {
    balanceSheet: bs,
    loading
  } = useAssetData()
  const isMobile = useIsMobile()

  if (loading) return <Loading/>

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <span className="font-light">Balance Sheet</span>
          <ChevronRight />
        </Button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"}>
        <SheetHeader>
          <SheetTitle className="font-light text-xl">
            Balance Sheet
          </SheetTitle>
          <SheetDescription className="font-light">
            Summary of fund assets by its origins and allocation
          </SheetDescription>
        </SheetHeader>
        <Card className="h-fit gap-3 border-0 py-0">
          <CardContent className="flex flex-col gap-2">
            <CardDescription>Total Assets</CardDescription>
            <div className="flex flex-col">
              <BSItem header label="Assets" value={bs.totalAssets}/>
              {bs.assets.map((item: AssetItem) => (
                <BSItem key={item.type} label={item.type} value={item.totalAmount}/>
              ))}
            </div>

            <Separator className="mt-2 mb-4" />

            <CardDescription>Total Liabilities</CardDescription>
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
          </CardContent>
        </Card>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
