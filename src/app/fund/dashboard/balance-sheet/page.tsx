import getBalanceSheet from "@fund/actions/get-balancesheet"
import { Spinner } from "@/components/ui/spinner"
import { Suspense } from "react"
import BalanceSheet from "@fund/components/dashboard/balance-sheet"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <BSData />
    </Suspense>
  )
}

async function BSData() {
  const data = await getBalanceSheet()

  const liability = data
    .filter((r) => r.asset_class === "liability")
    .reduce((sum, r) => sum + r.total_value, 0)

  const equity = data
    .filter((r) => r.asset_class === "equity")
    .reduce((sum, r) => sum + r.total_value, 0)

  return <BalanceSheet bsData={data} liability={liability} equity={equity} />
}
