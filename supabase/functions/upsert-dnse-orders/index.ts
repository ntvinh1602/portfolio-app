import { serve } from "std/http/server";
import { createClient } from "@supabase/supabase-js";

interface Order {
  id: number;
  side: string;
  symbol: string;
  orderStatus: string;
  fillQuantity: number;
  averagePrice: number;
  modifiedDate: string;
  taxRate: number;
  feeRate: number;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SB_SECRET_KEY") ?? ""
);

serve(async (_req: Request) => {
  try {
    const username = Deno.env.get("DNSE_USERNAME");
    const password = Deno.env.get("DNSE_PASSWORD");
    const accountNo = Deno.env.get("DNSE_ACCOUNTID");

    if (!username || !password || !accountNo) {
      throw new Error(
        "Missing DNSE_USERNAME, DNSE_PASSWORD, or DNSE_ACCOUNTID environment variables"
      );
    }

    // Step 1: Login
    const loginResponse = await fetch(
      "https://api.dnse.com.vn/auth-service/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      throw new Error(`Login failed: ${errorData}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) {
      throw new Error("Login successful but no token received.");
    }

    // Step 2: Fetch Orders
    const response = await fetch(
      `https://api.dnse.com.vn/order-service/v2/orders?accountNo=${accountNo}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to fetch orders: ${errorData}`);
    }

    const { orders: dnseOrders }: { orders: Order[] } =
      await response.json();

    // Step 3: Filter only filled orders
    const filledOrders = dnseOrders.filter(
      (o) => o.orderStatus === "Filled"
    );

    if (filledOrders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No filled orders to sync.",
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Step 4: Upsert into database (ignore duplicates)
    const { error: upsertError } = await supabase
      .from("dnse_orders")
      .upsert(
        filledOrders.map((order) => ({
          id: order.id,
          side: (order.side === "NB" ? "buy" : "sell"),
          symbol: order.symbol,
          order_status: order.orderStatus,
          fill_quantity: order.fillQuantity,
          average_price: order.averagePrice,
          modified_date: order.modifiedDate,
          tax: order.taxRate * order.fillQuantity * order.averagePrice,
          fee:
            order.feeRate * order.fillQuantity * order.averagePrice +
            (order.side === "NS" ? order.fillQuantity * 0.3 : 0),
        })),
        {
          onConflict: "id",
          ignoreDuplicates: true,
        }
      );

    if (upsertError) {
      throw new Error(`Database error: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${filledOrders.length} filled orders.`,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Critical error in dnse order sync:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});