import { NextResponse, NextRequest } from "next/server"
import { Tables } from "@/types/database.types"

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

    // --- Shared fetch options ---
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600, // cache 10 minutes
        tags: ["stock-profit-loss", "assets", "cashflow"],
      },
    }

    // --- Forward query params (?year=2025, etc.) ---
    const searchParams = request.url.includes("?")
      ? "?" + request.url.split("?")[1]
      : ""

    // --- Parallel internal API requests ---
    const [stockPnLResponse, assetsResponse, cashflowResponse] = await Promise.all([
      fetch(`${baseURL}/api/internal/pnl-by-stock${searchParams}`, fetchOptions),
      fetch(`${baseURL}/api/internal/assets`, fetchOptions),
      fetch(`${baseURL}/api/internal/cashflow${searchParams}`, fetchOptions),
    ])

    // --- Validate responses ---
    for (const response of [stockPnLResponse, assetsResponse, cashflowResponse]) {
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || "Internal fetch failed")
      }
    }

    // --- Parse JSON responses ---
    const [stockPnL, assets, cashflow] = await Promise.all([
      stockPnLResponse.json(),
      assetsResponse.json(),
      cashflowResponse.json(),
    ])

    // --- Aggregate and return ---
    return NextResponse.json({
      stockPnL,
      assets: (assets as Tables<"assets">[]) || [],
      cashflow: cashflow || [],
    })
  } catch (error) {
    console.error("Gateway error:", error)
    const message =
      error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
