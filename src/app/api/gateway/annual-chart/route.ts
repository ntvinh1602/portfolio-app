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
    const year = searchParams.get("year")

    if (!year) {
      return NextResponse.json({ error: "Missing year parameter" }, { status: 400 })
    }

    // Build target URL to internal endpoint
    const targetUrl = new URL(`${baseUrl}/api/internal/annual-return-chart`)
    targetUrl.searchParams.set("year", year)

    const fetchOptions: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
      headers: {
        Authorization: `Bearer ${expectedSecret}`,
      },
      next: {
        revalidate: 600, // cache for 10 min
        tags: ["annual-chart"],
      },
    }

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
