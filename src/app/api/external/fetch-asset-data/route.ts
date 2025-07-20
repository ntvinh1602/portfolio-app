import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const type = searchParams.get('type') ?? 'stock'; // default to stock

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
  }

  const suffixedTicker = type === 'crypto' ? `${ticker}-USD` : `${ticker}.VN`;

  try {
    const quote = await yahooFinance.quote(suffixedTicker);
    const price = quote?.regularMarketPrice;

    if (price === undefined || price === null) {
      return NextResponse.json({ error: 'Could not fetch price for the given ticker' }, { status: 404 });
    }

    return NextResponse.json({ price });
  } catch (error) {
    console.error(`Error fetching data for ${suffixedTicker}:`, error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}