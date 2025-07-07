import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize the Supabase client with the service_role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

interface SuccessfulFetch {
  security_id: number;
  date: string;
  price: number;
}

// Helper function to fetch stock price from Yahoo Finance API
async function getStockPrice(ticker: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      console.error(`Yahoo API request failed for ${ticker} with status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price === 'number') {
      return price;
    } else {
      console.error(`Price not found in Yahoo API response for ${ticker}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching price for ${ticker} from Yahoo API:`, error);
    return null;
  }
}


Deno.serve(async (_req: Request) => {
  try {
    const { data: securities, error: securitiesError } = await supabase
      .from('securities')
      .select('id, ticker')
      .eq('asset_class', 'stock');

    if (securitiesError) {
      throw new Error(`Error fetching securities: ${securitiesError.message}`);
    }

    const successfulFetches: SuccessfulFetch[] = [];
    const failedFetches: string[] = [];

    for (const security of securities) {
      const suffixedTicker = `${security.ticker}.VN`;
      const price = await getStockPrice(suffixedTicker);

      if (price !== null) {
        successfulFetches.push({
          security_id: security.id,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          price: price,
        });
      } else {
        failedFetches.push(security.ticker);
      }
    }

    if (successfulFetches.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_stock_prices')
        .upsert(successfulFetches);

      if (upsertError) {
        // Even if upsert fails, we should still send a notification
        console.error('Error saving stock prices:', upsertError);
      }
    }

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'short' });
    const year = today.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    const summaryMessage = `
Updated closing price for stocks on ${formattedDate}:
- Success: ${successfulFetches.length}
- Failed: ${failedFetches.length}
Failed Tickers: ${failedFetches.join(', ')}
    `.trim();

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: summaryMessage,
        }),
      });
    }

    return new Response(JSON.stringify({ message: "Stock price fetching complete." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('Unhandled error:', error);
    // Also send a notification on critical failure
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `Critical Error in fetch-stock-prices: ${error.message}` }),
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});