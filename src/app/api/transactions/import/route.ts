import { createClient } from '@/lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { supabase } = createClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const fileContent = await file.text();
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');

  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV file must have a header and at least one data row' }, { status: 400 });
  }

  const headers = lines[0].split(',').map(header => header.trim());
  const transactions = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {} as Record<string, any>);
  });

  const { error } = await supabase.rpc('handle_bulk_transaction_import', {
    p_user_id: user.id,
    p_transactions_data: transactions,
  });

  if (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: 'Transactions imported successfully' });
}