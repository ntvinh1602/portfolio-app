import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.split("/api")[0]
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Auth + caching options
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${process.env.MY_APP_SECRET}`,
      },
      next: {
        revalidate: 600,
        tags: ["transactions"],
      },
    }

    // Build target URL
    const targetUrl = new URL(`${baseUrl}/api/internal/transactions`)
    if (startDate) targetUrl.searchParams.append("startDate", startDate)
    if (endDate) targetUrl.searchParams.append("endDate", endDate)

    // Fetch
    const response = await fetch(targetUrl, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error fetching transactions:", errorText)
      throw new Error("Failed to fetch transactions")
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in /api/internal/transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}
