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
  const startTime = Date.now();

  try {
    const rates = await getExchangeRates();
    if (!rates || !rates.VND || !rates.MYR) {
      throw new Error('Failed to fetch exchange rates or missing VND/MYR rates.');
    }

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
      .upsert(dataToUpsert, { onConflict: 'date,currency_code' }); // Added onConflict for safety

    if (upsertError) {
      throw new Error(`Database error: ${upsertError.message}`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const summaryMessage = `
💹 Exchange Rate Update - ${formattedDate}

✅ Success: 1/1 (100.0%)
FX Rate: 1 MYR = ${myrToVndRate.toFixed(2)} VND
⏱️ Duration: ${duration}s
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
      message: "Exchange rate fetching complete.",
      stats: {
        rate: `1 MYR = ${myrToVndRate.toFixed(2)} VND`,
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
          text: `🚨 ERROR (Exchange Rates)\n\n${errorMessage}\n\nDuration: ${duration}s`,
        }),
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      duration: `${duration}s`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});