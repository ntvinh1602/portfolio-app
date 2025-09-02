import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";

export const dynamic = "force-dynamic"

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
    const startDate = searchParams.get("start")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!startDate) {
      return NextResponse.json({ error: "Missing start date" }, { status: 400 })
    }

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`price-driven`],
      },
    }

    const [pnlResponse, twrResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/monthly-pnl?start=${startDate}`, fetchOptions),
      fetch(`${baseUrl}/api/query/monthly-twr?start=${startDate}`, fetchOptions),
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

    const earningsData = pnlData.map((pnlItem: PnlData) => {
      const twrItem = twrData.find(
        (t: TwrData) => t.month === pnlItem.month
      );
      return {
        ...pnlItem,
        twr: twrItem ? twrItem.twr : 0,
      };
    });

    return NextResponse.json(earningsData)
    
  } catch (error) {
    console.error("Error fetching earnings data:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    );
  }
}