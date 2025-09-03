import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import yahooFinance from 'https://esm.sh/yahoo-finance2@2.13.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

interface SuccessfulFetch {
  asset_id: string;
  date: string;
  price: number;
}

// Helper function to send a Telegram message
async function sendTelegramMessage(message: string) {
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });
  }
}

// Helper function using yahoo-finance2
async function getCryptoPriceYF2(ticker: string): Promise<number | null> {
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

// Batch processing function using yahoo-finance2
async function batchFetchPrices(tickers: string[]): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();
  
  // Process in smaller batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    try {
      // Try batch processing if supported
      const quotes = await yahooFinance.quote(batch, {});
      
      // Handle both single and multiple quote responses
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
      
      // CRITICAL FIX: Map quotes back to tickers using symbol, not array index
      if (quotesArray.length === 1 && batch.length === 1) {
        // Single quote response
        const quote = quotesArray[0];
        const ticker = batch[0];
        results.set(ticker, quote.regularMarketPrice ?? null);
      } else {
        // Multiple quotes - map by symbol to avoid index misalignment
        quotesArray.forEach((quote) => {
          const symbol = quote.symbol;
          if (symbol && batch.includes(symbol)) {
            results.set(symbol, quote.regularMarketPrice ?? null);
          }
        });
        
        // Ensure all batch tickers are accounted for
        batch.forEach(ticker => {
          if (!results.has(ticker)) {
            console.warn(`No quote returned for ${ticker}, marking as failed`);
            results.set(ticker, null);
          }
        });
      }
      
    } catch (error) {
      console.error(`Batch fetch failed for ${batch.join(', ')}, falling back to individual requests:`, error);
      
      // Fallback to individual requests
      for (const ticker of batch) {
        const price = await getCryptoPriceYF2(ticker);
        results.set(ticker, price);
        
        // Small delay between individual requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Delay between batches
    if (i + batchSize < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

Deno.serve(async (_req: Request) => {
  
  try {
    console.log('Starting yahoo-finance2 crypto price fetch...');
    
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, ticker')
      .eq('asset_class', 'crypto');

    if (assetsError) {
      throw new Error(`Error fetching assets: ${assetsError.message}`);
    }

    if (!assets || assets.length === 0) {
      throw new Error('No assets found');
    }

    console.log(`Found ${assets.length} assets to process`);

    // Prepare tickers with -USD suffix
    const tickers = assets.map(a => `${a.ticker}-USD`);
    
    // Use yahoo-finance2 for batch fetching
    const priceResults = await batchFetchPrices(tickers);
    
    const successfulFetches: SuccessfulFetch[] = [];
    const failedFetches: string[] = [];

    assets.forEach(asset => {
      const suffixedTicker = `${asset.ticker}-USD`;
      const price = priceResults.get(suffixedTicker);
      
      if (price !== null && price !== undefined) {
        successfulFetches.push({
          asset_id: asset.id,
          date: new Date().toISOString().split('T')[0],
          price: price,
        });
      } else {
        failedFetches.push(asset.ticker);
      }
    });

    // Save to database
    if (successfulFetches.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_crypto_prices')
        .upsert(successfulFetches, {
          onConflict: 'asset_id,date'
        });

      if (upsertError) {
        throw new Error(`Database error: ${upsertError.message}`);
      }
    }

    const successRate = ((successfulFetches.length / assets.length) * 100).toFixed(1);

    if (failedFetches.length > 0) {
      const errorMessage = `Failed to fetch prices for: ${failedFetches.join(', ')}`;
      await sendTelegramMessage(`🚨 ERROR (fetch-crypto-prices)\n\n${errorMessage}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Crypto price fetching complete (yahoo-finance2)",
      method: "yahoo-finance2",
      stats: {
        total: assets.length,
        successful: successfulFetches.length,
        failed: failedFetches.length,
        successRate: `${successRate}%`
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('Critical error:', errorMessage);
    await sendTelegramMessage(`🚨 ERROR (fetch-crypto-prices)\n\n${errorMessage}`);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      method: "yahoo-finance2",
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});