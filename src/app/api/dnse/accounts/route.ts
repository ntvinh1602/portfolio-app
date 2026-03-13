import { getAccounts } from "@/lib/dnse/accounts"

export async function GET() {
  try {
    const accounts = await getAccounts()

    return Response.json({
      accounts,
    })
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    )
  }
}