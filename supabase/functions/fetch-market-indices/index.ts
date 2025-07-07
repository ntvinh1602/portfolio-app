import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize the Supabase client with the service_role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

// Helper function to fetch index price from Yahoo Finance API
async function getIndexPrice(ticker: string): Promise<number | null> {
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
    const ticker = '^VNINDEX.VN';
    const price = await getIndexPrice(ticker);

    let summaryMessage: string;

    if (price !== null) {
      const dataToUpsert = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        symbol: '^VNINDEX',
        close: price,
      };

      const { error: upsertError } = await supabase
        .from('daily_market_indices')
        .upsert(dataToUpsert);

      if (upsertError) {
        console.error('Error saving index price:', upsertError);
        summaryMessage = `Error saving price for ${ticker}: ${upsertError.message}`;
      } else {
        const today = new Date();
        const day = today.getDate();
        const month = today.toLocaleString('default', { month: 'short' });
        const year = today.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;
        summaryMessage = `Updated closing price of VN-Index on ${formattedDate}: ${price}`;
      }
    } else {
      summaryMessage = `Failed to fetch closing price for VN-Index.`;
    }

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

    return new Response(JSON.stringify({ message: "Market index price fetching complete." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('Unhandled error:', error);
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `Critical Error in fetch-market-indices: ${error.message}` }),
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});