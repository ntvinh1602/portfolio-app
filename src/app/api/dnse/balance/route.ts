import { getPrimaryAccountBalance } from "@/lib/dnse/balances"

export async function GET() {
  try {
    const balance = await getPrimaryAccountBalance()

    return Response.json(balance)
  } catch {
    return Response.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    )
  }
}