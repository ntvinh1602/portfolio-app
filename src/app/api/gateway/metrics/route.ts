import { NextResponse } from "next/server";
import { calculateCAGR, calculateSharpeRatio } from "@/lib/utils";
import { createClient } from "@/lib/supabase/supabaseServer";

// Route segment configuration
export const dynamic = "force-dynamic" // Since we need user-specific data

export async function GET(request: Request) {
  try {
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
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user
    const isAnonymous = !user?.email
    const sessionId = session?.access_token?.slice(-10) ?? "anon"
    const cacheKey = user ? `metrics-${user.id}-${sessionId}` : "metrics-anonymous"
    const revalidateTime = isAnonymous ? 3600 : 1800

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        tags: [cacheKey],
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
      fetch(`${baseUrl}/api/query/twr?start_date=${lifetimeStartDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/monthly-twr?start_date=${lifetimeStartDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/pnl?start_date=${startDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(`${baseUrl}/api/query/twr?start_date=${startDateStr}&end_date=${endDateStr}`, fetchOptions),
      fetch(
        `${baseUrl}/api/query/benchmark-chart?start_date=${startDateStr}&end_date=${endDateStr}&threshold=200`,
        fetchOptions,
      ),
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

    return NextResponse.json({
      cagr: cagrValue,
      sharpeRatio: sharpeRatioValue,
      totalPnl: pnlData.pnl,
      totalReturn: twrData.twr,
      benchmarkChartData: benchmarkData,
    });
  } catch (error) {
    console.error("Error fetching metrics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics data" },
      { status: 500 }
    );
  }
}