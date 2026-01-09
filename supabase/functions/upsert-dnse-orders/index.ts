import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_SIGNAL_GROUP_ID = Deno.env.get('TELEGRAM_SIGNAL_GROUP_ID'); // Use your own chat ID or a group chat ID

// Helper to send Telegram messages
async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_SIGNAL_GROUP_ID) {
    console.warn('Telegram credentials not set — skipping notification.');
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_SIGNAL_GROUP_ID,
    text,
    parse_mode: 'Markdown',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('Failed to send Telegram message:', await res.text());
  }
}

serve(async (_req: Request) => {
  try {
    const username = Deno.env.get('DNSE_USERNAME');
    const password = Deno.env.get('DNSE_PASSWORD');

    if (!username || !password) {
      throw new Error('DNSE_USERNAME and DNSE_PASSWORD environment variables are not set');
    }

    // Step 1: Login
    const loginResponse = await fetch('https://api.dnse.com.vn/auth-service/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${JSON.stringify(errorData)}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    if (!token) throw new Error('Login successful, but no token received.');

    // Step 2: Fetch Orders
    const accountNo = Deno.env.get('DNSE_ACCOUNTID');
    if (!accountNo) throw new Error('DNSE_ACCOUNTID environment variable is not set');

    const response = await fetch(`https://api.dnse.com.vn/order-service/v2/orders?accountNo=${accountNo}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to fetch transactions: ${JSON.stringify(errorData)}`);
    }

    const { orders: dnseOrders }: { orders: Order[] } = await response.json();

    // Step 3: Upsert filled orders — but only notify new ones
    const filledOrders = dnseOrders.filter(o => o.orderStatus === 'Filled');

    // Fetch existing order IDs
    const { data: existingOrders, error: fetchError } = await supabase
      .from('dnse_orders')
      .select('id');

    if (fetchError) {
      throw new Error(`Failed to fetch existing orders: ${fetchError.message}`);
    }

    const existingIds = new Set(existingOrders?.map(o => o.id));

    // Filter to only new ones
    const newOrders = filledOrders.filter(order => !existingIds.has(order.id));

    if (newOrders.length === 0) {
      console.log('No new filled orders.');
      return new Response(JSON.stringify({ success: true, message: 'No new filled orders.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Upsert (in case of race condition / redundancy)
    const { error: upsertError } = await supabase
      .from('dnse_orders')
      .upsert(
        newOrders.map(order => ({
          id: order.id,
          side: order.side,
          symbol: order.symbol,
          order_status: order.orderStatus,
          fill_quantity: order.fillQuantity,
          average_price: order.averagePrice,
          modified_date: order.modifiedDate,
          tax: order.taxRate * order.fillQuantity * order.averagePrice,
          fee: order.feeRate * order.fillQuantity * order.averagePrice
            + (order.side === 'NS' ? order.fillQuantity * 0.3 : 0),
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );

    if (upsertError) throw new Error(`Database error: ${upsertError.message}`);

    // Notify only for new ones
    for (const order of newOrders) {
      const message =
        `📈 *New Filled Trade*\n\n` +
        `*Symbol:* ${order.symbol}\n` +
        `*Side:* ${order.side === 'NB' ? 'Buy' : 'Sell'}\n` +
        `*Quantity:* ${order.fillQuantity}\n` +
        `*Price:* ${order.averagePrice.toFixed(2)}\n` +
        `*Date:* ${new Date(order.modifiedDate).toLocaleString('vi-VN')}`;
      await sendTelegramMessage(message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Upserted and notified ${newOrders.length} new filled orders.`,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Critical error in upsert-dnse-orders:', errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
