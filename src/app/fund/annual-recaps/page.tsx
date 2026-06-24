import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { getRecaps } from "@fund/actions/get-recaps"
import AnnualRecaps from "@fund/components/annual-recaps/wrapper"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnnualRecapsData />
    </Suspense>
  )
}

async function AnnualRecapsData() {
  const recaps = await getRecaps()

  return <AnnualRecaps recaps={recaps} startYear={2021} />
}