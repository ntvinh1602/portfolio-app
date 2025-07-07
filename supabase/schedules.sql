-- schedules.sql
-- This file contains all scheduled jobs for the project

-- Schedule the fetch-stock-prices function to run at 8:00 AM UTC every weekday
-- This corresponds to 3:00 PM in Vietnam (UTC+7)

-- Drop existing job if recreating
SELECT cron.unschedule('fetch-daily-stock-prices');

-- Schedule the fetch-stock-prices
SELECT cron.schedule(
  'fetch-daily-stock-prices',
  '0 8 * * 1-5',
  $$
    SELECT net.http_post(
      url:='https://pamvtxbkdjnvkzeutmjk.supabase.co/functions/v1/fetch-stock-prices',
      headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbXZ0eGJrZGpudmt6ZXV0bWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTk3MzUzMiwiZXhwIjoyMDY1NTQ5NTMyfQ.sM5c5QWu3yhQJHg4qGsvp7rec4dCpRay_jaW74KLio0"}'
    )
  $$
);