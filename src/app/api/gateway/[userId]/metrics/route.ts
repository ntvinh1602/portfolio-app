import { NextResponse } from "next/server";
import { calculateCAGR, calculateSharpeRatio } from "@/lib/utils";
import { createClient } from "@/lib/supabase/supabaseServer";

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
    const startDateStr = searchParams.get("start_date")
    const endDateStr = searchParams.get("end_date")
    const lifetimeStartDateStr = searchParams.get("lifetime_start_date")

    if (!startDateStr || !endDateStr || !lifetimeStartDateStr) {
      return NextResponse.json(
        { error: "start_date, end_date, and lifetime_start_date are required" },
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

    const revalidateTime = isAnonymous ? 3600 : 1800

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: revalidateTime,
      },
    }

    const [
      performanceRes,
      monthlyTwrRes,
      pnlRes,
      twrRes,
      benchmarkChartRes,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/query/${userIdToUse}/twr?start_date=${lifetimeStartDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${userIdToUse}/monthly-twr?start_date=${lifetimeStartDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${userIdToUse}/pnl?start_date=${startDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${userIdToUse}/twr?start_date=${startDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/${userIdToUse}/benchmark-chart?start_date=${startDateStr}&end_date=${endDateStr}&threshold=200`, fetchOptions),
    ])

    for (const response of [performanceRes, monthlyTwrRes, pnlRes, twrRes, benchmarkChartRes]) {
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching metrics data: ${response.url} - ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch from ${response.url}`);
      }
    }

    const [
      performance,
      monthlyTwrData,
      pnlData,
      twrData,
      benchmarkData,
    ] = await Promise.all([
      performanceRes.json(),
      monthlyTwrRes.json(),
      pnlRes.json(),
      twrRes.json(),
      benchmarkChartRes.json(),
    ]);

    const years = (new Date(endDateStr).getTime() - new Date(lifetimeStartDateStr).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const cagrValue = calculateCAGR(1, 1 + performance.twr, years);
    const monthlyReturns = monthlyTwrData.map((item: { twr: number }) => item.twr);
    const sharpeRatioValue = calculateSharpeRatio(monthlyReturns, 0.055);

    return NextResponse.json(
      {
        cagr: cagrValue,
        sharpeRatio: sharpeRatioValue,
        totalPnl: pnlData.pnl,
        totalReturn: twrData.twr,
        benchmarkChartData: benchmarkData,
      },
      {
        headers: {
          "Vary": "Authorization",
          "Cache-Control": "public, max-age=900, stale-while-revalidate=180",
          "x-vercel-cache-tags": `metrics-${userIdToUse}`,
        },
      },
    )
  } catch (error) {
    console.error("Error fetching metrics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics data" },
      { status: 500 }
    );
  }
}