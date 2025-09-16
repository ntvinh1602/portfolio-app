import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.split("/api")[0]
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get("txnID")
    const includeExpenses = searchParams.get("isExpense") === "true"

    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      )
    }

    // Auth + caching options
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${process.env.MY_APP_SECRET}`,
      },
      next: {
        revalidate: 600,
        tags: ["transaction-details"],
      },
    }

    // Build target URL
    const targetUrl = new URL(`${baseUrl}/api/internal/txn-details`)
    targetUrl.searchParams.append("txnID", transactionId)
    targetUrl.searchParams.append("isExpense", includeExpenses.toString())

    // Fetch
    const response = await fetch(targetUrl, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error fetching transaction details:", errorText)
      throw new Error("Failed to fetch transaction details")
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in /api/internal/txn-details:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction details" },
      { status: 500 }
    )
  }
}
