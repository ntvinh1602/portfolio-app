// scripts/backfill_performance_snapshots.ts
//
// This script backfills the `daily_performance_snapshots` table for all users.
// It fetches all user IDs from the `profiles` table and calls the 
// `generate_performance_snapshots` PostgreSQL function for each user.
//
// Usage:
// 1. Make sure you have a .env.local file in the root of the project with:
//    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
//    SUPABASE_SERVICE_KEY=your_supabase_service_role_key
// 2. Run the script using tsx:
//    npx tsx scripts/backfill_performance_snapshots.ts

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service key are required. Make sure to create a .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillPerformanceSnapshots() {
  // --- DATE RANGE ---
  // Change these dates to control the backfill period.
  const startDate = '2021-11-09';
  const endDate = new Date().toISOString().split('T')[0]; // Today's date

  console.log(`Starting backfill from ${startDate} to ${endDate}...`);

  try {
    // 1. Fetch all user IDs from the profiles table
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) {
      console.error('Error fetching users:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found to backfill.');
      return;
    }

    console.log(`Found ${users.length} users to process.`);

    // 2. For each user, call the RPC function
    for (const user of users) {
      const userId = user.id;
      console.log(`Backfilling data for user ${userId}...`);

      const { error: rpcError } = await supabase.rpc('generate_performance_snapshots', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (rpcError) {
        console.error(`Error backfilling for user ${userId}:`, rpcError.message);
      } else {
        console.log(`Successfully completed backfill for user ${userId}.`);
      }
    }

    console.log('Backfill process completed for all users.');

  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

backfillPerformanceSnapshots();