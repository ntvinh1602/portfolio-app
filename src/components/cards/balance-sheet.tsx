import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Sheet,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Debts } from "@/components/debts"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatNum } from "@/lib/utils"
import { ChevronRight, BookCheck } from "lucide-react"
import { AssetItem, BalanceSheetData } from "@/types/dashboard-data"

interface BSItemProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: boolean
  label: string
  value?: string
  clickable?: boolean
  className?: string
}

interface BalanceSheetProps {
  title?: boolean
  data: BalanceSheetData | null
}

function BSItem({ header = false, label, value, clickable=false, className, ...props }: BSItemProps) {

  return (
    <Card className={`border-0 py-3 rounded-md ${header && "bg-muted"} ${className}`} {...props}>
      <CardHeader className="flex px-4 justify-between">
        {clickable ? 
          <CardTitle className="flex items-center gap-1">
            <span className="text-sm font-thin">{label}</span>
            <ChevronRight className="size-4 stroke-1" />
          </CardTitle>
          : <span className="text-sm font-thin">{label}</span>
        }
        <CardAction className="font-thin text-sm">{value}</CardAction>
      </CardHeader>
    </Card>
  )
}

function BSSkeleton({ header = false, label }: BSItemProps) {
  return (
    <Card className={`border-0 py-3 rounded-md ${header && "bg-muted"}`}>
      <CardHeader className="flex px-4 justify-between">
        <span className="font-thin text-sm">{label}</span>
        <CardAction className="font-thin text-sm">
          <Skeleton className="h-5 w-32" />
        </CardAction>
      </CardHeader>
    </Card>
  )
}

export function BalanceSheet({ title = false, data }: BalanceSheetProps) {
  return (
    <Card className={`h-fit gap-3 ${!title && "border-0 px-6 py-0"}`}>
      {title && 
        <CardHeader className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">Balance Sheet</CardTitle>
          <BookCheck className="stroke-1 text-muted-foreground" />
        </CardHeader>
      }
      <CardContent className="flex flex-col gap-2">
        <CardDescription>Total Assets</CardDescription>
        {!data ? 
          <div className="flex flex-col">
            <BSSkeleton header={true} label="Assets"/>
            {Array.from(["Cash","Stocks","EPF","Crypto"]).map((label) => (
              <BSSkeleton key={label} label={label}/>
            ))}
          </div> : 
          <div className="flex flex-col">
            <BSItem
              header={true}
              label="Assets"
              value={formatNum(data.totalAssets)}
            />
            {data.assets.map((item: AssetItem) => (
              <BSItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
          </div>
        }
        <Separator className="mt-2 mb-4"/>
        <CardDescription>Total Liabilities</CardDescription>
        {!data ? 
          <div className="flex flex-col">
            <BSSkeleton header={true} label="Liabilities"/>
            <BSSkeleton label="Debts Principal"/>
            <BSSkeleton label="Accrued Interest"/>
            <BSSkeleton header={true} label="Equities"/>
            <BSSkeleton label="Owner Capital"/>
            <BSSkeleton label="Unrealized P/L"/>
          </div> : 
          <div className="flex flex-col">
            <Sheet>
              <SheetTrigger asChild>
                <BSItem
                  header={true}
                  label="Liabilities"
                  value={formatNum(data.totalLiabilities)}
                  clickable={true}
                />
              </SheetTrigger>
              <Debts />
            </Sheet>
            {data.liabilities.map((item: AssetItem) => (
              <BSItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
            <BSItem
              header={true}
              label="Equities"
              value={formatNum(data.totalEquity)}
            />
            {data.equity.map((item: AssetItem) => (
              <BSItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
          </div>
        }
      </CardContent>
    </Card>
  )
}