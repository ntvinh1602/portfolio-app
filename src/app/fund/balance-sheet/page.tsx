import getBalanceSheet from "@fund/actions/get-balancesheet"
import { FlatItemList } from "@fund/components/balance-sheet/flat-item-list"
import { GroupedItemList } from "@fund/components/balance-sheet/grouped-item-list"
import { BalanceSheetSectionCard } from "@fund/components/balance-sheet/section-card"
import type { BSItem } from "@fund/components/balance-sheet/types"
import { Spinner } from "@/components/ui/spinner"
import { Box, DollarSign, HandCoins } from "lucide-react"
import { Suspense } from "react"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <BalanceSheetContent />
    </Suspense>
  )
}

async function BalanceSheetContent() {
  const { bsData, totalAssets, totalLiabilities, totalEquity } =
    await getBalanceSheet()

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
      liabilities: [] as BSItem[],
      equities: [] as BSItem[],
      groupedAssets: {} as Record<string, BSItem[]>,
    }
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="mx-auto grid w-full grid-cols-1 gap-4 px-4 xl:w-7/10 xl:grid-cols-2 2xl:w-6/10">
        <BalanceSheetSectionCard title="Assets" total={totalAssets} icon={Box}>
          <GroupedItemList groups={groupedAssets} />
        </BalanceSheetSectionCard>

        <div className="flex flex-1 flex-col gap-4">
          <BalanceSheetSectionCard
            title="Liabilities"
            total={totalLiabilities}
            icon={HandCoins}
          >
            <FlatItemList items={liabilities} />
          </BalanceSheetSectionCard>

          <BalanceSheetSectionCard title="Equity" total={totalEquity} icon={DollarSign}>
            <FlatItemList items={equities} />
          </BalanceSheetSectionCard>
        </div>
      </div>
    </div>
  )
}
