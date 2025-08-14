import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const username = process.env.DNSE_USERNAME;
    const password = process.env.DNSE_PASSWORD;

    if (!username || !password) {
      return NextResponse.json({ message: 'DNSE_USERNAME and DNSE_PASSWORD environment variables are not set' }, { status: 500 });
    }

    const response = await fetch('https://api.dnse.com.vn/auth-service/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ message: 'Login failed', error: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error during DNSE login:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}