import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const { headers } = request;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;
    const isAnonymous = !user?.email;
    const revalidateTime = isAnonymous ? 3600 : 1800;

    const baseUrl = request.url.split("/api")[0];

    const fetchOptions = {
      headers,
      next: {
        revalidate: revalidateTime,
      },
    };

    const response = await fetch(
      `${baseUrl}/api/query/${userId}/monthly-expenses?start_date=${startDate}&end_date=${endDate}`,
      fetchOptions
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error fetching expenses data: ${response.url} - ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(`Failed to fetch from ${response.url}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": "public, max-age=900, stale-while-revalidate=180",
        "x-vercel-cache-tags": `expenses-${userId}`,
      },
    });
  } catch (error) {
    console.error("Error fetching expenses data:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses data" },
      { status: 500 }
    );
  }
}