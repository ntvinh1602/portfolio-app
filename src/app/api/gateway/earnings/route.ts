import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";

// Route segment configuration
export const dynamic = "force-dynamic" // Since we need user-specific data

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
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user
    const isAnonymous = !user?.email
    const sessionId = session?.access_token?.slice(-10) ?? "anon"
    const cacheKey = user ? `earnings-${user.id}-${sessionId}` : "earnings-anonymous"
    const revalidateTime = isAnonymous ? 3600 : 1800

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        tags: [cacheKey],
        revalidate: revalidateTime,
      },
    }

    const [pnlResponse, twrResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/monthly-pnl?start_date=${startDate}&end_date=${endDate}`, fetchOptions),
      fetch(`${baseUrl}/api/query/monthly-twr?start_date=${startDate}&end_date=${endDate}`, fetchOptions),
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
    ]);

    const combinedData = pnlData.map((pnlItem: PnlData) => {
      const twrItem = twrData.find(
        (t: TwrData) => t.month === pnlItem.month
      );
      return {
        ...pnlItem,
        twr: twrItem ? twrItem.twr : 0,
      };
    });

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error("Error fetching earnings data:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    );
  }
}