import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

interface Result {
    successful: string[];
    failed: { userId: string; error: string; }[];
}

Deno.serve(async (_req: Request) => {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`)
    }

    const today = new Date().toISOString().split('T')[0];
    
    const results: Result = {
        successful: [],
        failed: []
    };

    if (profiles) {
        for (const profile of profiles) {
          const userId = profile.id;
          const { error } = await supabase.rpc('generate_performance_snapshots', {
            p_user_id: userId,
            p_start_date: today,
            p_end_date: today
          })
    
          if (error) {
            console.error(`Error generating snapshot for user ${userId}:`, error)
            results.failed.push({ userId, error: error.message });
          } else {
            results.successful.push(userId);
          }
        }
    }

    const summaryMessage = `
      Performance snapshot generation process completed on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}:
      - Successful users: ${results.successful.length}
      - Failed users: ${results.failed.length}
      ${results.failed.length > 0 ? `Failed users: ${results.failed.map(f => f.userId).join(', ')}` : ''}
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

    return new Response(
      JSON.stringify({ 
          message: "Performance snapshot generation process completed.",
          successful_users: results.successful.length,
          failed_users: results.failed.length,
          failures: results.failed
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    )
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('Unhandled error:', error);

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `Critical Error in generate-performance-snapshots: ${error.message}` }),
      });
    }

    return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
})