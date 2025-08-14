'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Order {
  id: number;
  side: string;
  accountNo: string;
  investorId: string;
  symbol: string;
  price: number;
  quantity: number;
  orderType: string;
  orderStatus: string;
  fillQuantity: number;
  lastQuantity: number;
  lastPrice: number;
  averagePrice: number;
  transDate: string;
  createdDate: string;
  modifiedDate: string;
  taxRate: number;
  feeRate: number;
  leaveQuantity: number;
  canceledQuantity: number;
  priceSecure: number;
  custody: string;
  channel: string;
  loanPackageId: number;
  initialRate: number;
  error: string;
}

export default function DnseTradesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Attempt to get token from localStorage first
        let storedToken = localStorage.getItem('dnse_jwt_token');

        if (!storedToken) {
          // If no token, try to log in via API route
          const loginResponse = await fetch('/api/dnse/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!loginResponse.ok) {
            const errorData = await loginResponse.json();
            throw new Error(errorData.message || 'Login failed');
          }

          const loginData = await loginResponse.json();
          storedToken = loginData.token;
          if (storedToken) {
            localStorage.setItem('dnse_jwt_token', storedToken);
          }
        }

        setToken(storedToken);

        // Fetch transactions using the token
        // The accountNo is now handled by the backend API route using environment variables
        const transactionsResponse = await fetch('/api/dnse/transactions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (!transactionsResponse.ok) {
          const errorData = await transactionsResponse.json();
          throw new Error(errorData.message || 'Failed to fetch transactions');
        }

        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.orders || []);

      } catch (err: any) {
        setError(err.message);
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">DNSE Transaction History</h1>
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-6 w-1/4 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">DNSE Transaction History</h1>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">DNSE Transaction History</h1>

      {transactions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Side
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trans Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.side}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.orderStatus}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.transDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-gray-500">No transactions found.</p>
      )}
    </div>
  );
}