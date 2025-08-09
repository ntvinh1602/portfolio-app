'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Database } from '@/lib/database.types';

type LiveCryptoPrice = Database['public']['Tables']['live_securities_data']['Row'];

function isLiveCryptoPrice(obj: any): obj is LiveCryptoPrice {
    return obj && typeof obj.symbol === 'string' && typeof obj.price === 'number' && typeof obj.trade_time === 'string';
}

export default function BitcoinPriceFeed() {
  const [price, setPrice] = useState<LiveCryptoPrice | null>(null);
  const pathname = usePathname();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker on first mount
    if (!workerRef.current) {
      workerRef.current = new Worker('/crypto-worker.js');

      workerRef.current.onmessage = (event) => {
        if (isLiveCryptoPrice(event.data)) {
          setPrice(event.data);
        }
      };
    }

    const worker = workerRef.current;

    if (pathname === '/') {
      // Start the worker when on the home page
      worker.postMessage({
        action: 'start',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
    }

    // This cleanup function is GUARANTEED to run when the pathname changes,
    // or when the component unmounts. This is the key.
    return () => {
      if (worker) {
        worker.postMessage({ action: 'stop' });
        setPrice(null);
      }
    };
  }, [pathname]); // The effect is perfectly synchronized with navigation

  if (pathname !== '/') {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg text-center">
      <h2 className="text-2xl font-bold mb-2">Bitcoin (BTC/USDT)</h2>
      {price ? (
        <div>
          <p className="text-4xl font-mono">${price.price.toLocaleString()}</p>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(price.trade_time).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p>Loading price...</p>
      )}
    </div>
  );
}