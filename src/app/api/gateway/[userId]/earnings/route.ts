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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
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
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAnonymous = !user.email
    const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID
    if (!DEMO_USER_ID) {
      throw new Error("DEMO_USER_ID is not set in environment variables")
    }
    const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id

    if (userIdToUse !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }    

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: 600,
        tags: [`price-driven-${userIdToUse}`],
      },
    }

    const [pnlResponse, twrResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/${userIdToUse}/monthly-pnl?start_date=${startDate}&end_date=${endDate}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${userIdToUse}/monthly-twr?start_date=${startDate}&end_date=${endDate}`, fetchOptions),
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

    return NextResponse.json(combinedData, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": "public, max-age=900, stale-while-revalidate=180",
        "x-vercel-cache-tags": `price-driven-${userIdToUse}`,
      },
    })
  } catch (error) {
    console.error("Error fetching earnings data:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    );
  }
}