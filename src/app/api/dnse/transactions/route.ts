import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const accountNo = process.env.DNSE_ACCOUNTID;
    const authorizationHeader = request.headers.get('Authorization');

    if (!accountNo) {
      return NextResponse.json({ message: 'DNSE_ACCOUNTID environment variable is not set' }, { status: 500 });
    }

    if (!authorizationHeader) {
      return NextResponse.json({ message: 'Authorization header is required' }, { status: 401 });
    }

    const response = await fetch(`https://api.dnse.com.vn/order-service/v2/orders?accountNo=${accountNo}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizationHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ message: 'Failed to fetch transactions', error: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching DNSE transactions:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}