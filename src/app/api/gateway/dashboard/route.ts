import { NextResponse } from "next/server"
import { format, subDays, startOfMonth, subMonths } from "date-fns"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = "force-dynamic" // Since we need user-specific data

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const { headers } = request
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const DEMO_USER_ID = process.env.DEMO_USER_ID

    if (!DEMO_USER_ID) {
      throw new Error("DEMO_USER_ID is not set in environment variables")
    }

    const user = session?.user
    const isAnonymous = !user?.email
    const userIdToUse = isAnonymous ? DEMO_USER_ID : user?.id
    const sessionId = session?.access_token?.slice(-10) ?? "anon"
    const cacheKey = user ? `dashboard-${user.id}-${sessionId}` : "dashboard-anonymous"
    const revalidateTime = isAnonymous ? 3600 : 1800

    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : subDays(endDate, 90)
    const monthlyPnlStartDate = startOfMonth(subMonths(endDate, 11))

    const formattedStartDate = format(startDate, "yyyy-MM-dd")
    const formattedEndDate = format(endDate, "yyyy-MM-dd")
    const formattedMonthlyPnlStartDate = format(monthlyPnlStartDate, "yyyy-MM-dd")

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        tags: [cacheKey],
        revalidate: revalidateTime,
      },
    }

    const [
      equityResponse,
      twrResponse,
      monthlyPnlResponse,
      benchmarkResponse,
      assetSummaryResponse,
      holdingsResponse,
    ] = await Promise.all([
      fetch(
        `${baseUrl}/api/query/equity-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`,
        fetchOptions,
      ),
      fetch(`${baseUrl}/api/query/twr?start_date=${formattedStartDate}&end_date=${formattedEndDate}`, fetchOptions),
      fetch(
        `${baseUrl}/api/query/monthly-pnl?start_date=${formattedMonthlyPnlStartDate}&end_date=${formattedEndDate}`,
        fetchOptions,
      ),
      fetch(
        `${baseUrl}/api/query/benchmark-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`,
        fetchOptions,
      ),
      fetch(`${baseUrl}/api/query/asset-summary`, fetchOptions),
      fetch(`${baseUrl}/api/gateway/holdings`, fetchOptions),
    ])

    for (const response of [
      equityResponse,
      twrResponse,
      monthlyPnlResponse,
      benchmarkResponse,
      assetSummaryResponse,
      holdingsResponse,
    ]) {
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error fetching dashboard data: ${response.url} - ${response.status} ${response.statusText}`, errorText)
        throw new Error(`Failed to fetch from ${response.url}`)
      }
    }

    const [
      equityData,
      twrData,
      monthlyPnlData,
      benchmarkData,
      assetSummaryData,
      holdingsData,
    ] = await Promise.all([
      equityResponse.json(),
      twrResponse.json(),
      monthlyPnlResponse.json(),
      benchmarkResponse.json(),
      assetSummaryResponse.json(),
      holdingsResponse.json(),
    ]);

    return NextResponse.json(
      {
        equityData,
        twrData,
        monthlyPnlData,
        benchmarkData,
        assetSummaryData,
        holdingsData,
      },
      {
        headers: {
          "Vary": "Authorization",
          "Cache-Control": isAnonymous
            ? "public, max-age=1800, stale-while-revalidate=360"
            : "private, max-age=900, stale-while-revalidate=180",
          "X-Cache-Key": `${userIdToUse}-${sessionId}`,
        },
      },
    )

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}