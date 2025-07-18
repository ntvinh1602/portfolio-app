import { NextResponse } from "next/server"

type PnlData = {
  month: string
  pnl: number
}

type TwrData = {
  month: string
  twr: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const { headers } = request
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      )
    }

    const baseUrl = request.url.split('/api')[0]

    const [pnlResponse, twrResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/monthly-pnl?start_date=${startDate}&end_date=${endDate}`, { headers, next: { tags: ['performance-data'] } }),
      fetch(`${baseUrl}/api/query/monthly-twr?start_date=${startDate}&end_date=${endDate}`, { headers, next: { tags: ['performance-data'] } }),
    ])

    for (const response of [pnlResponse, twrResponse]) {
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching earnings data: ${response.url} - ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch from ${response.url}`);
      }
    }

    const [pnlData, twrData] = await Promise.all([
      pnlResponse.json(),
      twrResponse.json(),
    ])

    const combinedData = pnlData.map((pnlItem: PnlData) => {
      const twrItem = twrData.find(
        (t: TwrData) => t.month === pnlItem.month
      )
      return {
        ...pnlItem,
        twr: twrItem ? twrItem.twr : 0,
      }
    })

    return NextResponse.json(combinedData)
  } catch (error) {
    console.error("Error fetching earnings data:", error)
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    )
  }
}