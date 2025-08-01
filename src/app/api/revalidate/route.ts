import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// Route segment configuration
export const dynamic = "force-dynamic"

// Define a type for the expected webhook payload
interface WebhookPayload {
  table: string
  record: {
    user_id?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-secret-token")
    const expectedSecret = process.env.REVALIDATION_TOKEN

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload: WebhookPayload = await request.json()
    const { table, record } = payload
    const userId = record?.user_id

    if (!table || !userId) {
      return NextResponse.json(
        { error: "Missing table or user_id in payload" },
        { status: 400 },
      )
    }

    // Revalidate based on the table that was updated for the specific user
    if (table === "transactions") {
      revalidateTag(`price-driven-${userId}`)
      revalidateTag(`txn-driven-${userId}`)
    } else if (
      table === "daily_stock_prices" ||
      table === "daily_exchange_rates"
    ) {
      revalidateTag(`price-driven-${userId}`)
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