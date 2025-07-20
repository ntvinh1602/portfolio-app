import { createClient } from "@/lib/supabase/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { ticker, price, type } = await request.json();
  const supabase = await createClient();

  if (!ticker || !price || !type) {
    return NextResponse.json({ error: "Ticker, price, and type are required" }, { status: 400 });
  }

  try {
    let rpcName;
    if (type === 'crypto') {
      rpcName = 'upsert_daily_crypto_price';
    } else {
      rpcName = 'upsert_daily_stock_price';
    }

    const { error } = await supabase.rpc(rpcName, {
      p_ticker: ticker,
      p_price: price,
    });

    if (error) {
      console.error(`Error inserting new ${type} price:`, error);
      return NextResponse.json({ error: `Failed to update ${type} price` }, { status: 500 });
    }

    return NextResponse.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} price updated successfully` });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}