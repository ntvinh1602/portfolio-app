import { NextResponse } from "next/server"
import { format, subDays, startOfMonth, subMonths } from "date-fns"
import { createClient } from "@/lib/supabase/supabaseServer"

interface StockHolding {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  latest_price: number
}

interface CryptoHolding {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  latest_price: number
  latest_usd_rate: number
}
// Route segment configuration
export const dynamic = "force-dynamic" // Since we need user-specific data

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
    const { searchParams } = new URL(request.url)
    const { headers } = request
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user } = session
    const isAnonymous = !user.email
    const DEMO_USER_ID = process.env.DEMO_USER_ID
    if (!DEMO_USER_ID) {
      throw new Error("DEMO_USER_ID is not set in environment variables")
    }
    const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id

    if (userIdToUse !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
        `${baseUrl}/api/query/${userIdToUse}/equity-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`,
        fetchOptions,
      ),
      fetch(`${baseUrl}/api/query/${userIdToUse}/twr?start_date=${formattedStartDate}&end_date=${formattedEndDate}`, fetchOptions),
      fetch(
        `${baseUrl}/api/query/${userIdToUse}/monthly-pnl?start_date=${formattedMonthlyPnlStartDate}&end_date=${formattedEndDate}`,
        fetchOptions,
      ),
      fetch(
        `${baseUrl}/api/query/${userIdToUse}/benchmark-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`,
        fetchOptions,
      ),
      fetch(`${baseUrl}/api/query/${userIdToUse}/asset-summary`, fetchOptions),
      fetch(`${baseUrl}/api/gateway/${userIdToUse}/holdings`, fetchOptions),
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
    ])

    const holdingsDataWithTotalAmount = {
      stockHoldings: holdingsData.stockHoldings.map((holding: StockHolding) => ({
        ...holding,
        total_amount: holding.quantity * holding.latest_price,
      })),
      cryptoHoldings: holdingsData.cryptoHoldings.map((holding: CryptoHolding) => ({
        ...holding,
        total_amount:
          holding.quantity * holding.latest_price * holding.latest_usd_rate,
      })),
    }

    return NextResponse.json(
      {
        equityData,
        twrData,
        monthlyPnlData,
        benchmarkData,
        assetSummaryData,
        holdingsData: holdingsDataWithTotalAmount,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=900, stale-while-revalidate=180",
          "Vary": "Authorization",
          "x-vercel-cache-tags": `dashboard-${userIdToUse}`,
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