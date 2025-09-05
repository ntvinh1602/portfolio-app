import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatNum } from "@/lib/utils"
import { AssetItem } from "@/types/dashboard-data"
import { useAssetData } from "@/context/asset-data-context"
import { Loading } from "../loader"

interface BSItemProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: boolean
  label: string
  value?: string
  className?: string
}

interface BalanceSheetProps {
  title?: boolean
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
        <CardAction className="font-thin text-sm">{value}</CardAction>
      </CardHeader>
    </Card>
  )
}

export function BalanceSheet({ title = false }: BalanceSheetProps) {
  const { balanceSheet, loading } = useAssetData()

  if (loading) {
    return (
      <Loading/>
    )
  }

  return (
    <Card className={`h-fit gap-3 ${!title && "border-0 py-0"}`}>
      {title && (
        <CardHeader className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">Balance Sheet</CardTitle>
        </CardHeader>
      )}

      <CardContent className="flex flex-col gap-2">
        <CardDescription>Total Assets</CardDescription>
        <div className="flex flex-col">
          <BSItem
            header
            label="Assets"
            value={formatNum(balanceSheet.totalAssets)}
          />
          {balanceSheet.assets.map((item: AssetItem) => (
            <BSItem
              key={item.type}
              label={item.type}
              value={formatNum(item.totalAmount)}
            />
          ))}
        </div>

        <Separator className="mt-2 mb-4" />

        <CardDescription>Total Liabilities</CardDescription>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <BSItem
              header
              label="Liabilities"
              value={formatNum(balanceSheet.totalLiabilities)}
            />
            {balanceSheet.liabilities.map((item: AssetItem) => (
              <BSItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
          </div>

          <div className="flex flex-col">
            <BSItem
              header
              label="Equities"
              value={formatNum(balanceSheet.totalEquity)}
            />
            {balanceSheet.equity.map((item: AssetItem) => (
              <BSItem
                key={item.type}
                label={item.type}
                value={formatNum(item.totalAmount)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
