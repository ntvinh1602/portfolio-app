import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import yahooFinance from 'https://esm.sh/yahoo-finance2@2.13.3'

// Initialize the Supabase client with the service_role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

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
    })
  }
}

// Helper function using yahoo-finance2
async function getIndexPriceYF2(ticker: string): Promise<number | null> {
  try {
    const quote = await yahooFinance.quote(ticker, {
      // Configure options for better reliability
    })
    
    return quote.regularMarketPrice ?? null
  } catch (error) {
    console.error(`Error fetching price for ${ticker} with yahoo-finance2:`, error)
    return null
  }
}

Deno.serve(async (_req: Request) => {
  const ticker = '^VNINDEX.VN' // The ticker for VN-Index

  try {
    console.log(`Starting market index fetch for ${ticker} using yahoo-finance2...`)
    const price = await getIndexPriceYF2(ticker)
    let summaryMessage: string
    let success = false

    if (price !== null) {
      const dataToUpsert = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        symbol: '^VNINDEX', // The symbol in the database
        close: price,
      }

      const { error: upsertError } = await supabase
        .from('daily_market_indices')
        .upsert(dataToUpsert, {
          onConflict: 'symbol,date' // Ensure upsert works correctly
        })

      if (upsertError) {
        throw new Error(`Database error: ${upsertError.message}`)
      } else success = true
    } else {
      summaryMessage = `❌ Failed to fetch closing price for VN-Index.`
      await sendTelegramMessage(summaryMessage)
    }

    return new Response(JSON.stringify({
      success: success,
      message: success
        ? "Market index price fetching complete."
        : "Failed to fetch market index price.",
      method: "yahoo-finance2",
      stats: {
        ticker: ticker,
        price: price,
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    console.error('Critical error:', errorMessage)
    await sendTelegramMessage(`🚨 ERROR (fetch-market-indices)\n\n${errorMessage}`)

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      method: "yahoo-finance2"
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})