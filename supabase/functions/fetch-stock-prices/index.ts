import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Try importing yahoo-finance2 via ESM.sh
import yahooFinance from 'https://esm.sh/yahoo-finance2@2.13.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

interface SuccessfulFetch {
  security_id: string;
  date: string;
  price: number;
}

// Helper function using yahoo-finance2
async function getStockPriceYF2(ticker: string): Promise<number | null> {
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
        const price = await getStockPriceYF2(ticker);
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
  const startTime = Date.now();
  
  try {
    console.log('Starting yahoo-finance2 stock price fetch...');
    
    const { data: securities, error: securitiesError } = await supabase
      .from('securities')
      .select('id, ticker')
      .eq('asset_class', 'stock');

    if (securitiesError) {
      throw new Error(`Error fetching securities: ${securitiesError.message}`);
    }

    if (!securities || securities.length === 0) {
      throw new Error('No securities found');
    }

    console.log(`Found ${securities.length} securities to process`);

    // Prepare tickers with .VN suffix
    const tickers = securities.map(s => `${s.ticker}.VN`);
    
    // Use yahoo-finance2 for batch fetching
    const priceResults = await batchFetchPrices(tickers);
    
    const successfulFetches: SuccessfulFetch[] = [];
    const failedFetches: string[] = [];

    securities.forEach(security => {
      const suffixedTicker = `${security.ticker}.VN`;
      const price = priceResults.get(suffixedTicker);
      
      if (price !== null && price !== undefined) {
        successfulFetches.push({
          security_id: security.id,
          date: new Date().toISOString().split('T')[0],
          price: price,
        });
      } else {
        failedFetches.push(security.ticker);
      }
    });

    // Save to database
    if (successfulFetches.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_stock_prices')
        .upsert(successfulFetches, {
          onConflict: 'security_id,date'
        });

      if (upsertError) {
        console.error('Error saving stock prices:', upsertError);
        throw new Error(`Database error: ${upsertError.message}`);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const successRate = ((successfulFetches.length / securities.length) * 100).toFixed(1);
    
    const summaryMessage = `
📈 Stock Update (yahoo-finance2) - ${formattedDate}

✅ Success: ${successfulFetches.length}/${securities.length} (${successRate}%)
❌ Failed: ${failedFetches.length}
⏱️ Duration: ${duration}s

${failedFetches.length > 0 ? `Failed: ${failedFetches.join(', ')}` : ''}
    `.trim();

    // Send Telegram notification
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: summaryMessage,
        }),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Stock price fetching complete (yahoo-finance2)",
      method: "yahoo-finance2",
      stats: {
        total: securities.length,
        successful: successfulFetches.length,
        failed: failedFetches.length,
        duration: `${duration}s`,
        successRate: `${successRate}%`
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
          text: `🚨 ERROR (yahoo-finance2)\n\n${errorMessage}\n\nDuration: ${duration}s`,
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