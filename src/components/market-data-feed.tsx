// src/components/market-data-feed.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Define the type for our market data
type MarketData = {
  symbol: string;
  match_price: number;
  match_quantity: number;
  side: string;
  sending_time: string;
};

// Initialize the Supabase client (use public keys)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MarketDataFeed() {
  const [data, setData] = useState<MarketData[]>([]);

  useEffect(() => {
    // Set up the real-time subscription
    const channel = supabase
      .channel('stock_price_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_stock_prices' },
        (payload) => {
          console.log('New data received!', payload);
          // For upsert, we need to find and replace the existing item or add a new one
          setData((currentData) => {
            const existingIndex = currentData.findIndex(item => item.symbol === (payload.new as MarketData).symbol);
            if (existingIndex > -1) {
              const newData = [...currentData];
              newData[existingIndex] = payload.new as MarketData;
              return newData;
            }
            return [payload.new as MarketData, ...currentData];
          });
        }
      )
      .subscribe((status) => {
        // Once the subscription is active, fetch the initial data
        if (status === 'SUBSCRIBED') {
          fetchInitialData();
        }
      });

    // Fetch initial data
    const fetchInitialData = async () => {
      const { data: initialData, error } = await supabase
        .from('live_stock_prices')
        .select('*'); // No need for order or limit if only latest is stored

      if (error) {
        console.error('Error fetching initial data:', error);
      } else if (initialData) {
        setData(initialData);
      }
    };

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Real-Time Market Feed</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.symbol}>
                <td className="px-6 py-4 whitespace-nowrap">{item.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.match_price}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.match_quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.side}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(item.sending_time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}