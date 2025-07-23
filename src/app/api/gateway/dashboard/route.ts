import { NextResponse } from "next/server"
import { format, subDays, startOfMonth, subMonths } from "date-fns"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const revalidate = 3600
export const dynamic = 'force-dynamic' // Since we need user-specific data

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const { headers } = request
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? 'anonymous'

    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : subDays(endDate, 90)
    const monthlyPnlStartDate = startOfMonth(subMonths(endDate, 11))

    const formattedStartDate = format(startDate, "yyyy-MM-dd")
    const formattedEndDate = format(endDate, "yyyy-MM-dd")
    const formattedMonthlyPnlStartDate = format(monthlyPnlStartDate, "yyyy-MM-dd")

    const baseUrl = request.url.split('/api')[0]

    const [
      equityResponse,
      twrResponse,
      monthlyPnlResponse,
      benchmarkResponse,
      assetSummaryResponse,
      holdingsResponse,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/query/equity-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`, {
        headers,
        next: { tags: [`performance-data-${userId}`, `equity`] },
      }),
      fetch(`${baseUrl}/api/query/twr?start_date=${formattedStartDate}&end_date=${formattedEndDate}`, {
        headers,
        next: { tags: [`performance-data-${userId}`, `twr`] },
      }),
      fetch(`${baseUrl}/api/query/monthly-pnl?start_date=${formattedMonthlyPnlStartDate}&end_date=${formattedEndDate}`, {
        headers,
        next: { tags: [`performance-data-${userId}`, `pnl`] },
      }),
      fetch(`${baseUrl}/api/query/benchmark-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`, {
        headers,
        next: { tags: [`performance-data-${userId}`, `benchmark`] },
      }),
      fetch(`${baseUrl}/api/query/asset-summary`, {
        headers,
        next: { tags: [`asset-data-${userId}`, `assets`] },
      }),
      fetch(`${baseUrl}/api/gateway/holdings`, {
        headers,
        next: { tags: [`asset-data-${userId}`, "holdings"] },
      }),
    ]);

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

    return NextResponse.json({
      equityData,
      twrData,
      monthlyPnlData,
      benchmarkData,
      assetSummaryData,
      holdingsData,
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}