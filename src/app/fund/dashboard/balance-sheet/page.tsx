import getBalanceSheet from "@fund/actions/get-balancesheet"
import { Spinner } from "@/components/ui/spinner"
import { Suspense } from "react"
import BalanceSheet from "@/features/fund/components/dashboard/balance-sheet"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <BSData />
    </Suspense>
  )
}

async function BSData() {
  const { bsData, liability, equity } = await getBalanceSheet()
  return <BalanceSheet bsData={bsData} liability={liability} equity={equity} />
}
