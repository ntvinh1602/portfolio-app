import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { startDate } = await request.json();

  if (!startDate) {
    return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
  }

  const endDate = new Date().toISOString().split('T')[0];

  const { error } = await supabase.rpc('generate_performance_snapshots', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error('Error calling generate_performance_snapshots RPC:', error);
    return NextResponse.json({ error: 'Failed to start backfill process.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Backfill process started successfully.' });
}