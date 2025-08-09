import { NextResponse } from 'next/server';
import { connectCryptoFeed } from '@/lib/crypto-feed-handler';

export async function POST() {
  try {
    console.log("Attempting to connect to crypto feed...");
    connectCryptoFeed();
    return NextResponse.json({ message: 'Crypto feed connection process started.' });
  } catch (error) {
    console.error("Failed to start crypto feed connection:", error);
    return NextResponse.json({ error: 'Failed to start crypto feed connection' }, { status: 500 });
  }
}