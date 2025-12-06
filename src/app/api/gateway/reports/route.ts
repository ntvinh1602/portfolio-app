import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = process.env.MY_APP_SECRET

    if (!expectedSecret) {
      const errorMsg = "Server misconfigured: missing MY_APP_SECRET"
      console.error(errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const baseURL = request.url.split("/api")[0]

    // Prepare fetch options
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600,
        tags: ["stock-profit-loss"],
      },
    }

    // Optional: forward query params like ?year=2025
    const searchParams = request.url.includes("?")
      ? "?" + request.url.split("?")[1]
      : ""

    // Fetch internal API
    const [stockProfitLossResponse] = await Promise.all([
      fetch(`${baseURL}/api/internal/pnl-by-stock${searchParams}`, fetchOptions),
    ])

    // Validate responses
    if (!stockProfitLossResponse.ok) {
      const result = await stockProfitLossResponse.json()
      throw new Error(result.error || "Internal fetch failed")
    }

    // Parse response data
    const stockProfitLossData = await stockProfitLossResponse.json()

    // Return aggregated JSON
    return NextResponse.json({
      stockProfitLossData,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Gateway error:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
