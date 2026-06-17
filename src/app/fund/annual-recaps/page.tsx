import AnnualRecapsClient from "./client"
import { getRecaps } from "@/lib/server/recaps"

export default async function Page() {
  const recaps = await getRecaps()

  return <AnnualRecapsClient recaps={recaps} />
}