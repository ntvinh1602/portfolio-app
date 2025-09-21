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
    if (startDate) targetUrl.searchParams.append("startDate", startDate)
    if (endDate) targetUrl.searchParams.append("endDate", endDate)

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

    // Log raw response details
    const responseBody = await response.text();
    console.log("Internal Txn-feed API Raw Response Status:", response.status);
    console.log("Internal Txn-feed API Raw Response Headers:", Array.from(response.headers.entries()));
    console.log("Internal Txn-feed API Raw Response Body:", responseBody);

    // Stream response directly to client (preserve status & headers)
    return new NextResponse(responseBody, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
