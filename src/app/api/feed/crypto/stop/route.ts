import { NextResponse } from 'next/server';
import { disconnectCryptoFeed } from '@/lib/crypto-feed-handler';

export async function POST() {
  try {
    console.log("Attempting to disconnect from crypto feed...");
    disconnectCryptoFeed();
    return NextResponse.json({ message: 'Crypto feed disconnected successfully.' });
  } catch (error) {
    console.error("Failed to disconnect from crypto feed:", error);
    return NextResponse.json({ error: 'Failed to disconnect from crypto feed' }, { status: 500 });
  }
}