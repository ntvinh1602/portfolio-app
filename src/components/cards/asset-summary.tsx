import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatNum } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { SummaryItem, AssetSummaryData } from "@/types/assets"

interface AssetItemProps {
  header?: boolean
  label: string
  value?: string
  link?: string
}

interface AssetSummaryProps {
  title?: boolean
  data: AssetSummaryData | null
}

function AssetItem({ header = false, label, value, link }: AssetItemProps) {
  const router = useRouter()
  const handleNavigation = () => {
    if (link) router.push(link)
  }

  return (
    <Card className={`border-0 py-3 rounded-md ${header && "bg-muted"}`}>
      <CardHeader className="flex px-4 justify-between" onClick={handleNavigation}>
        {link ? 
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

function AssetSkeleton({ header = false, label }: AssetItemProps) {
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

export function AssetSummary({ title = false, data }: AssetSummaryProps) {
  return (
    <Card className={`px-4 h-fit gap-3 ${!title && "border-0 px-6 py-0"}`}>
      {title && <CardTitle>Balance Sheet</CardTitle>}
      <CardContent className="px-0">
        <CardDescription className="pb-2">Total Assets</CardDescription>
        {!data ? 
          <>
            <AssetSkeleton header={true} label="Assets"/>
            {Array.from(["Cash","Stocks","EPF","Crypto"]).map((label) => (
              <AssetSkeleton key={label} label={label}/>
            ))}
          </> : 
          <>
            <AssetItem
              header={true}
              label="Assets"
              value={formatNum(data.totalAssets)}
              link="/holdings"
            />
            {data.assets.map((item: SummaryItem) => (
              <AssetItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
          </>
        }
        <Separator className="mt-2 mb-4"/>
        <CardDescription className="pb-2">Total Liabilities</CardDescription>
        {!data ? 
          <>
            <AssetSkeleton header={true} label="Liabilities"/>
            <AssetSkeleton label="Debts Principal"/>
            <AssetSkeleton label="Accrued Interest"/>
            <AssetSkeleton header={true} label="Equities"/>
            <AssetSkeleton label="Owner Capital"/>
            <AssetSkeleton label="Unrealized P/L"/>
          </> : 
          <>
            <AssetItem
              header={true}
              label="Liabilities"
              value={formatNum(data.totalLiabilities)}
              link="/debts"
            />
            {data.liabilities.map((item: SummaryItem) => (
              <AssetItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
            <AssetItem
              header={true}
              label="Equities"
              value={formatNum(data.totalEquity)}
            />
            {data.equity.map((item: SummaryItem) => (
              <AssetItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
          </>
        }
      </CardContent>
    </Card>
  )
}