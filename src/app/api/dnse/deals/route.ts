import { getPrimaryAccountDeals } from "@/lib/dnse/deals"

export async function GET() {
  try {
    const deals = await getPrimaryAccountDeals()
    return Response.json({ deals })
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch primary account deals" },
      { status: 500 }
    )
  }
}