import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import {
  lifetime
} from "@/lib/start-dates"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
    const { headers } = request

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const baseURL = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`price-driven-${user.id}`],
      },
    }

    const [
      twrResponse,
      monthlyReturnResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      balanceSheetResponse,
      stockHoldingsResponse,
      cryptoHoldingsResponse,
    ] = await Promise.all([
      fetch(`${baseURL}/api/query/${user.id}/twr`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/monthly-twr?start=${lifetime}`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/pnl`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/equity-chart`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/benchmark-chart`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/balance-sheet`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/stock-holdings`, fetchOptions),
      fetch(`${baseURL}/api/query/${user.id}/crypto-holdings`, fetchOptions),
    ])

    for (const response of [
      twrResponse,
      monthlyReturnResponse,
      pnlResponse,
      equityResponse,
      benchmarkResponse,
      balanceSheetResponse,
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
      twrData,
      monthlyReturns,
      pnlData,
      equityData,
      benchmarkData,
      balanceSheetData,
      stockData,
      cryptoData,
    ] = await Promise.all([
      twrResponse.json(),
      monthlyReturnResponse.json(),
      pnlResponse.json(),
      equityResponse.json(),
      benchmarkResponse.json(),
      balanceSheetResponse.json(),
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
    ])

    const monthlyReturnData = monthlyReturns.map((item: { twr: number }) => item.twr)

    return NextResponse.json(
      {
        twrData,
        monthlyReturnData,
        pnlData,
        equityData,
        benchmarkData,
        balanceSheetData,
        stockData,
        cryptoData
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