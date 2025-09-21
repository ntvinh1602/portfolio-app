import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = process.env.MY_APP_SECRET

    if (!expectedSecret) {
      const errorMsg = "Server misconfigured: missing MY_APP_SECRET"
      console.error(errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const baseUrl = request.url.split("/api")[0]
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get("txnID")
    const includeExpenses = searchParams.get("isExpense") === "true"

    if (!transactionId) {
      const errorMsg = "transactionId is required"
      console.error(errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    // Auth + caching options
    const fetchOptions: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600,
        tags: ["transaction-details"],
      },
    }

    // Build target URL
    const targetUrl = new URL(`${baseUrl}/api/internal/txn-details`)
    targetUrl.searchParams.set("txnID", transactionId)
    targetUrl.searchParams.set("isExpense", includeExpenses.toString())

    // Fetch internal endpoint
    const response = await fetch(targetUrl, fetchOptions)

    let result: unknown
    try {
      result = await response.json()
    } catch {
      const bodyText = await response.text()
      console.error("Failed to parse JSON from internal txn-details:", bodyText)
      return NextResponse.json({ error: "Invalid JSON from internal service" }, { status: 502 })
    }

    if (!response.ok) {
      const errorMsg =
        typeof result === "object" &&
        result !== null &&
        "error" in result
          ? (result as { error: string }).error
          : "Failed to fetch transaction details"

      console.error("Internal txn-details error:", errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    // ✅ Always return JSON
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
