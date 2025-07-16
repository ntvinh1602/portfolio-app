// scripts/backfill_performance_snapshots.ts
//
// This script backfills the `daily_performance_snapshots` table for a specific user
// from a given start date.
//
// It calls the `generate_performance_snapshots` PostgreSQL function for the given user.
//
// Usage:
// 1. Make sure you have a .env.local file in the root of the project with:
//    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
//    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
// 2. Run the script using tsx:
//    npx tsx scripts/backfill_performance_snapshots.ts <user_id> <start_date>
//
//    - <user_id>: The ID of the user to backfill.
//    - <start_date>: The start date in YYYY-MM-DD format.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service key are required. Make sure to create a .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillForUser() {
  // --- PARSE ARGUMENTS ---
  const args = process.argv.slice(2);
  const userId = args[0];
  const startDate = args[1];

  if (!userId || !startDate) {
    console.error('Error: User ID and start date are required.');
    console.log(
      'Usage: npx tsx scripts/backfill_performance_snapshots.ts <user_id> <start_date>',
    );
    return;
  }

  // --- DATE RANGE ---
  // The end date is always today.
  const endDate = new Date().toISOString().split('T')[0];

  console.log(
    `Starting backfill for user ${userId} from ${startDate} to ${endDate}...`,
  );

  try {
    const { error: rpcError } = await supabase.rpc(
      'generate_performance_snapshots',
      {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      },
    );

    if (rpcError) {
      console.error(
        `Error backfilling for user ${userId}:`,
        rpcError.message,
      );
    } else {
      console.log(`Successfully completed backfill for user ${userId}.`);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

backfillForUser();