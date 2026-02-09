import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {

  // Initialize Supabase client
  const supabase = await createClient()

  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileContent = await file.text()
  const lines = fileContent.split('\n').filter(line => line.trim() !== '')

  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV file must have a header and at least one data row' }, { status: 400 })
  }

  const headers = lines[0].split(',').map(header => header.trim())
  const transactions = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim())
    const numericHeaders = ["quantity", "price", "interest_rate", "principal", "interest"]
    return headers.reduce((obj, header, index) => {
      const value = values[index]
      if (numericHeaders.includes(header) && value === '') {
        obj[header] = null
      } else {
        obj[header] = value
      }
      return obj
    }, {} as Record<string, string | null>)
  })

  const { error } = await supabase.rpc('import_transactions', {
    p_txn_data: transactions,
    p_start_date: '2021-11-09'
  })

  if (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Transactions imported successfully' })
}