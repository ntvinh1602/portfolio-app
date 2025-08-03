import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { inceptionDate } from "@/lib/utils"
import { format, subDays, startOfMonth, startOfYear } from "date-fns"

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

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
    const { headers } = request
    
    const last90D = format(subDays(new Date(), 90), "yyyy-MM-dd")
    const thisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd")
    const thisYear = format(startOfYear(new Date()), "yyyy-MM-dd")
    const lifetime = inceptionDate

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

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`price-driven-${requestedUserId}`],
      },
    }

    const [
      ytdReturnResponse,
      lifetimeReturnResponse,
      monthlyReturnResponse,
      lifetimePnLResponse,
      ytdPnLResponse,
      mtdPnlResponse,
      equityResponse,
      last90DBenchmarkResponse,
      ytdBenchmarkResponse,
      lifetimeBenchmarkResponse,
      assetSummaryResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/query/${requestedUserId}/twr?start=${thisYear}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/twr?start=${lifetime}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/monthly-twr?start=${lifetime}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/pnl?start=${lifetime}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/pnl?start=${thisYear}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/pnl?start=${thisMonth}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/equity-chart?start=${last90D}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/benchmark-chart?start=${last90D}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/benchmark-chart?start=${thisYear}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/benchmark-chart?start=${lifetime}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/asset-summary`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/stock-holdings`, fetchOptions),
      fetch(`${baseUrl}/api/query/${requestedUserId}/crypto-holdings`, fetchOptions),
    ])

    for (const response of [
      ytdReturnResponse,
      lifetimeReturnResponse,
      monthlyReturnResponse,
      lifetimePnLResponse,
      ytdPnLResponse,
      mtdPnlResponse,
      equityResponse,
      last90DBenchmarkResponse,
      ytdBenchmarkResponse,
      lifetimeBenchmarkResponse,
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
      ytdReturnData,
      lifetimeReturnData,
      monthlyReturns,
      lifetimePnLData,
      ytdPnLData,
      mtdPnLData,
      equityData,
      last90DBenchmarkData,
      ytdBenchmarkData,
      lifetimeBenchmarkData,
      assetSummaryData,
      stockHoldings,
      cryptoHoldings,
    ] = await Promise.all([
      ytdReturnResponse.json(),
      lifetimeReturnResponse.json(),
      monthlyReturnResponse.json(),
      lifetimePnLResponse.json(),
      ytdPnLResponse.json(),
      mtdPnlResponse.json(),
      equityResponse.json(),
      last90DBenchmarkResponse.json(),
      ytdBenchmarkResponse.json(),
      lifetimeBenchmarkResponse.json(),
      assetSummaryResponse.json(),
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
    ])

    const holdingsData = {
      stockHoldings: stockHoldings.map((holding: StockHolding) => ({
        ...holding,
        total_amount: holding.quantity * holding.latest_price,
      })),
      cryptoHoldings: cryptoHoldings.map((holding: CryptoHolding) => ({
        ...holding,
        total_amount: holding.quantity * holding.latest_price * holding.latest_usd_rate,
      })),
    }

    const monthlyReturnData = monthlyReturns.map((item: { twr: number }) => item.twr)

    return NextResponse.json(
      {
        ytdReturnData,
        lifetimeReturnData,
        monthlyReturnData,
        lifetimePnLData,
        ytdPnLData,
        mtdPnLData,
        equityData,
        last90DBenchmarkData,
        ytdBenchmarkData,
        lifetimeBenchmarkData,
        assetSummaryData,
        holdingsData,
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