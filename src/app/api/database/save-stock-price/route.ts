import { createClient } from "@/lib/supabase/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { ticker, price } = await request.json();
  const supabase = await createClient();

  if (!ticker || !price) {
    return NextResponse.json({ error: "Ticker and price are required" }, { status: 400 });
  }

  try {
    const { error } = await supabase.rpc('upsert_daily_stock_price', {
      p_ticker: ticker,
      p_price: price,
    });

    if (error) {
      console.error("Error inserting new price:", error);
      return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
    }

    return NextResponse.json({ message: "Price updated successfully" });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}