// @ts-ignore: Deno environment is unable to resolve types from the remote module.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize the Supabase client with the service_role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
const OPENEXCHANGERATES_APP_ID = Deno.env.get('OPENEXCHANGERATES_APP_ID');

interface ExchangeRates {
  [key: string]: number;
}

async function getExchangeRates(): Promise<ExchangeRates | null> {
  const url = `https://openexchangerates.org/api/latest.json?app_id=${OPENEXCHANGERATES_APP_ID}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`OpenExchangeRates API request failed with status: ${response.status}`);
      return null;
    }
    const data: { rates: ExchangeRates } = await response.json();
    return data.rates;
  } catch (error) {
    console.error('Error fetching from OpenExchangeRates API:', error);
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const rates = await getExchangeRates();
    let summaryMessage: string;

    if (rates && rates.VND && rates.MYR) {
      const vndRate = rates.VND;
      const myrRate = rates.MYR;
      const myrToVndRate = vndRate / myrRate;

      const dataToUpsert = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        currency_code: 'MYR',
        rate: myrToVndRate,
      };

      const { error: upsertError } = await supabase
        .from('daily_exchange_rates')
        .upsert(dataToUpsert);

      if (upsertError) {
        console.error('Error saving exchange rate:', upsertError);
        summaryMessage = `Error saving MYR to VND exchange rate: ${upsertError.message}`;
      } else {
        const today = new Date();
        const day = today.getDate();
        const month = today.toLocaleString('default', { month: 'short' });
        const year = today.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;
        summaryMessage = `Updated MYR/VND exchange rate on ${formattedDate}: ${myrToVndRate.toFixed(2)}`;
      }
    } else {
      summaryMessage = 'Failed to fetch exchange rates or missing VND/MYR rates.';
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

    return new Response(JSON.stringify({ message: "Exchange rate fetching complete." }), {
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
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `Critical Error in fetch-exchange-rates: ${error.message}` }),
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});