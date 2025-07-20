import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Supabase client setup
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MAX_ATTEMPTS = 3;

serve(async (_req) => {
  try {
    // 1. Fetch a batch of pending or retry-able jobs.
    // It selects jobs that are 'pending' OR have 'failed' but have been attempted less than MAX_ATTEMPTS.
    const { data: jobs, error: fetchError } = await supabase
      .from("revalidation_queue")
      .select("*, attempts")
      .or(`status.eq.pending,and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS})`)
      .limit(20);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending jobs." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Process each job individually to handle retries.
    const processingPromises = jobs.map(async (job) => {
      try {
        // 3. Mark job as 'processing' and increment its attempt count atomically.
        const currentAttempt = (job.attempts || 0) + 1;
        await supabase
          .from("revalidation_queue")
          .update({ status: "processing", attempts: currentAttempt })
          .eq("id", job.id);

        // 4. Attempt the revalidation call.
        const response = await fetch(
          `${Deno.env.get("APP_URL")}/api/revalidate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("REVALIDATE_TOKEN")}`,
            },
            body: JSON.stringify({
              [job.job_type]: job.identifier,
            }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Revalidation failed with status ${response.status}: ${errorBody}`);
        }

        // 5. If successful, mark as 'completed'.
        await supabase
          .from("revalidation_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", job.id);

      } catch (e) {
        // 6. If it fails, mark as 'failed'. The query will pick it up again if attempts < MAX_ATTEMPTS.
        await supabase
          .from("revalidation_queue")
          .update({ status: "failed", last_error: (e as Error).message })
          .eq("id", job.id);
      }
    });

    await Promise.all(processingPromises);

    return new Response(JSON.stringify({ message: `Processed ${jobs.length} jobs.` }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Revalidation worker error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});