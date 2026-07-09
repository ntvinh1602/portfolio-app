import { withSupabase } from "npm:@supabase/server"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
const OPENEXCHANGERATES_APP_ID = Deno.env.get('OPENEXCHANGERATES_APP_ID')

interface ExchangeRates {
  [key: string]: number
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
    })
  }
}

async function getExchangeRates(): Promise<ExchangeRates | null> {
  const url = `https://openexchangerates.org/api/latest.json?app_id=${OPENEXCHANGERATES_APP_ID}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`OpenExchangeRates API request failed with status: ${response.status}`)
      return null
    }
    const data: { rates: ExchangeRates } = await response.json()
    return data.rates
  } catch (error) {
    console.error('Error fetching from OpenExchangeRates API:', error)
    return null
  }
}

async function getCurrencies(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('currencies')
    .select('code')
    .neq('code', 'VND')

  if (error) {
    console.error('Error fetching currencies:', error)
    return []
  }
  // @ts-ignore: data is not null here
  return data.map((c: { code: string }) => c.code)
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    try {
      const supabase = ctx.supabaseAdmin
      const [rates, currenciesToFetch] = await Promise.all([
        getExchangeRates(),
        getCurrencies(supabase),
      ])

      if (!rates || !rates.VND) {
        throw new Error('Failed to fetch exchange rates or missing VND rate.')
      }

      if (currenciesToFetch.length === 0) {
        throw new Error('No currencies found to process.')
      }

      const vndRate = rates.VND
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      const dataToUpsert = currenciesToFetch
        .map(currencyCode => {
          const currencyRate = rates[currencyCode]
          if (!currencyRate) {
            console.warn(`Rate for ${currencyCode} not found in API response. Skipping.`)
            return null
          }
          const rateToVnd = vndRate / currencyRate
          return {
            date: today,
            currency_code: currencyCode,
            rate: rateToVnd,
          }
        })
        .filter(item => item !== null)

      if (dataToUpsert.length === 0) {
        throw new Error('No valid exchange rates could be calculated.')
      }

      // @ts-ignore: dataToUpsert is not null here
      const { error: upsertError } = await supabase
        .from('historical_fxrate')
        .upsert(dataToUpsert, { onConflict: 'currency_code,date' })

      if (upsertError) {
        throw new Error(`Database error: ${upsertError.message}`)
      }

      return Response.json({
        success: true,
        message: "Exchange rate fetching complete.",
        stats: {
          successful_updates: dataToUpsert.length,
          total_currencies: currenciesToFetch.length
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error('Critical error:', errorMessage)
      await sendTelegramMessage(`🚨 ERROR (fetch-exchange-rates)\n\n${errorMessage}`)

      return Response.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }
  }),
}