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
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
        revalidate: 600,
        tags: [`price-driven-${requestedUserId}`],
      },
    }

    const [
      equityResponse,
      twrResponse,
      monthlyPnlResponse,
      benchmarkResponse,
      assetSummaryResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
    ] = await Promise.all([
      fetch(
        `${baseUrl}/api/query/${requestedUserId}/equity-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`,
        fetchOptions,
      ),
      fetch(`${baseUrl}/api/query/${requestedUserId}/twr?start_date=${formattedStartDate}&end_date=${formattedEndDate}`, fetchOptions),
      fetch(
        `${baseUrl}/api/query/${requestedUserId}/monthly-pnl?start_date=${formattedMonthlyPnlStartDate}&end_date=${formattedEndDate}`,
        fetchOptions,
      ),
      fetch(
        `${baseUrl}/api/query/${requestedUserId}/benchmark-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`,
        fetchOptions,
      ),
      fetch(`${baseUrl}/api/query/${requestedUserId}/asset-summary`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/stock-holdings`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/crypto-holdings`, fetchOptions),
    ])

    for (const response of [
      equityResponse,
      twrResponse,
      monthlyPnlResponse,
      benchmarkResponse,
      assetSummaryResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
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
      stockHoldings,
      cryptoHoldings,
    ] = await Promise.all([
      equityResponse.json(),
      twrResponse.json(),
      monthlyPnlResponse.json(),
      benchmarkResponse.json(),
      assetSummaryResponse.json(),
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
    ])

    const holdingsDataWithTotalAmount = {
      stockHoldings: stockHoldings.map((holding: StockHolding) => ({
        ...holding,
        total_amount: holding.quantity * holding.latest_price,
      })),
      cryptoHoldings: cryptoHoldings.map((holding: CryptoHolding) => ({
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
      }
    )

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}