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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (_req: Request) => {
  try {
    const username = Deno.env.get('DNSE_USERNAME');
    const password = Deno.env.get('DNSE_PASSWORD');

    if (!username || !password) {
      throw new Error('DNSE_USERNAME and DNSE_PASSWORD environment variables are not set');
    }

    const loginResponse = await fetch('https://api.dnse.com.vn/auth-service/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${JSON.stringify(errorData)}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) {
      throw new Error('Login successful, but no token received.');
    }

    const accountNo = Deno.env.get('DNSE_ACCOUNTID');
    if (!accountNo) {
      throw new Error('DNSE_ACCOUNTID environment variable is not set');
    }

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


    const { data, error } = await supabase
      .from('dnse_orders')
      .upsert(
        dnseOrders
        .filter(order => order.orderStatus == 'Filled') // Only get filled orders
        .map((order) => ({
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

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully upserted ${dnseOrders.length} orders.`,
      data: data
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Critical error in upsert-dnse-orders:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});