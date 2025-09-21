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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build target URL
    const targetUrl = new URL(`${baseUrl}/api/internal/transactions`)
    if (startDate) targetUrl.searchParams.set("startDate", startDate)
    if (endDate) targetUrl.searchParams.set("endDate", endDate)

    // Fetch options
    const fetchOptions: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600,
        tags: ["transactions"],
      },
    }

    // Fetch internal endpoint
    const response = await fetch(targetUrl, fetchOptions)

    if (!response.ok) {
      const errorResult = await response.json().catch(() => null)
      const errorMsg = errorResult?.error || `Internal API failed with ${response.status}`
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    const result = await response.json()

    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
