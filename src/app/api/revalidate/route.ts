import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// Route segment configuration
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-secret-token")
    const expectedSecret = process.env.REVALIDATION_TOKEN

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const table = request.headers.get("x-table-name")

    if (!table) {
      return NextResponse.json(
        { error: "Missing x-table-name header" },
        { status: 400 },
      )
    }

    // Revalidate based on the table that was updated
    if (table === "transactions") {
      revalidateTag(`price-driven`)
      revalidateTag(`txn-driven`)
    } else if (
      table === "daily_stock_prices" || table === "daily_exchange_rates"
    ) {
      revalidateTag(`price-driven`)
    }

    return NextResponse.json({ revalidated: true, now: Date.now() })
  } catch (error) {
    console.error("Error in revalidation webhook:", error)
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 },
    )
  }
}