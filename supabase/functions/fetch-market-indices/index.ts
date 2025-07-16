import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Try importing yahoo-finance2 via ESM.sh
import yahooFinance from 'https://esm.sh/yahoo-finance2@2.13.3';

// Initialize the Supabase client with the service_role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

// Helper function using yahoo-finance2
async function getIndexPriceYF2(ticker: string): Promise<number | null> {
  try {
    const quote = await yahooFinance.quote(ticker, {
      // Configure options for better reliability
    });
    
    return quote.regularMarketPrice ?? null;
  } catch (error) {
    console.error(`Error fetching price for ${ticker} with yahoo-finance2:`, error);
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  const startTime = Date.now();
  const ticker = '^VNINDEX.VN'; // The ticker for VN-Index

  try {
    console.log(`Starting market index fetch for ${ticker} using yahoo-finance2...`);
    
    const price = await getIndexPriceYF2(ticker);

    let summaryMessage: string;
    let success = false;

    if (price !== null) {
      const dataToUpsert = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        symbol: '^VNINDEX', // The symbol in the database
        close: price,
      };

      const { error: upsertError } = await supabase
        .from('daily_market_indices')
        .upsert(dataToUpsert, {
            onConflict: 'symbol,date' // Ensure upsert works correctly
        });

      if (upsertError) {
        console.error('Error saving index price:', upsertError);
        throw new Error(`Database error: ${upsertError.message}`);
      } else {
        success = true;
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        summaryMessage = `✅ Successfully updated VN-Index on ${formattedDate}: ${price}`;
      }
    } else {
      summaryMessage = `❌ Failed to fetch closing price for VN-Index.`;
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    const finalMessage = `
📈 Market Index Update (yahoo-finance2)

${summaryMessage}
⏱️ Duration: ${duration}s
    `.trim();

    // Send Telegram notification
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: finalMessage,
        }),
      });
    }

    return new Response(JSON.stringify({
      success: success,
      message: success ? "Market index price fetching complete." : "Failed to fetch market index price.",
      method: "yahoo-finance2",
      stats: {
        ticker: ticker,
        price: price,
        duration: `${duration}s`,
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.error('Critical error:', errorMessage);
    
    // Send error notification
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `🚨 ERROR (fetch-market-indices)\n\n${errorMessage}\n\nDuration: ${duration}s`,
        }),
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      method: "yahoo-finance2",
      duration: `${duration}s`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});