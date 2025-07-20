import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Supabase client setup
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (_req) => {
  try {
    // 1. Fetch a batch of pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from("revalidation_queue")
      .select("*")
      .in("status", ["pending", "failed"])
      .limit(20);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending jobs." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Mark jobs as 'processing' to prevent duplicate execution
    const jobIds = jobs.map((job) => job.id);
    await supabase
      .from("revalidation_queue")
      .update({ status: "processing", attempts: 1 }) // Simplified: assumes first attempt
      .in("id", jobIds);

    // 3. Process each job
    const processingPromises = jobs.map(async (job) => {
      try {
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
          const headers = JSON.stringify(Object.fromEntries(response.headers.entries()));
          throw new Error(`Revalidation failed with status ${response.status}. Headers: ${headers}. Body: ${errorBody}`);
        }

        // Mark as completed
        await supabase
          .from("revalidation_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", job.id);

      } catch (e) {
        // Mark as failed
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