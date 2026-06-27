import getBalanceSheet from "@fund/actions/get-balancesheet"
import { FlatItemList } from "@fund/components/dashboard/balance-sheet/flat-list"
import { GroupedItemList } from "@fund/components/dashboard/balance-sheet/group-list"
import type { Asset } from "@fund/fund.types"
import { Spinner } from "@/components/ui/spinner"
import { Box, DollarSign, HandCoins } from "lucide-react"
import { Suspense } from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <BalanceSheet />
    </Suspense>
  )
}

async function BalanceSheet() {
  const { bsData, liability, equity } = await getBalanceSheet()
  const { liabilities, equities, groupedAssets } = bsData.reduce(
    (acc, item) => {
      if (item.asset_class === "equity") {
        acc.equities.push(item)
      } else if (item.asset_class === "liability") {
        acc.liabilities.push(item)
      } else {
        const key = item.asset_class
        if (!acc.groupedAssets[key]) acc.groupedAssets[key] = []
        acc.groupedAssets[key].push(item)
      }

      return acc
    },
    {
      liabilities: [] as Asset[],
      equities: [] as Asset[],
      groupedAssets: {} as Record<string, Asset[]>,
    },
  )

  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="mx-auto grid grid-cols-1 gap-4 px-4 w-full xl:grid-cols-2 xl:max-w-250">
        <Card>
          <CardHeader>
            <CardDescription>Assets</CardDescription>
            <CardTitle className="text-2xl">
              {formatNum(liability + equity)}
            </CardTitle>
            <CardAction>
              <Box className="stroke-1" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <GroupedItemList groups={groupedAssets} />
          </CardContent>
        </Card>

        <div className="flex flex-1 flex-col gap-4 w-full">
          <Card>
            <CardHeader>
              <CardDescription>Liabilities</CardDescription>
              <CardTitle className="text-2xl">{formatNum(liability)}</CardTitle>
              <CardAction>
                <HandCoins className="stroke-1" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <FlatItemList items={liabilities} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Equity</CardDescription>
              <CardTitle className="text-2xl">{formatNum(equity)}</CardTitle>
              <CardAction>
                <DollarSign className="stroke-1" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <FlatItemList items={equities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
