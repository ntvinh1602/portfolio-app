import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { getRecaps } from "@/lib/server/recaps"
import AnnualRecapsClient from "./client"

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnnualRecapsData />
    </Suspense>
  )
}

async function AnnualRecapsData() {
  const recaps = await getRecaps()

  return <AnnualRecapsClient recaps={recaps} startYear={2021} />
}