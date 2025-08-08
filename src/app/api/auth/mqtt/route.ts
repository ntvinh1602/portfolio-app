// src/app/api/auth/mqtt/route.ts
import { NextResponse } from 'next/server';
import { connectMqtt } from '@/lib/mqtt-handler';

export async function GET() {
  try {
    console.log("Attempting to connect to MQTT broker...");
    connectMqtt(); // This function now runs in the background
    return NextResponse.json({ message: 'MQTT connection process started.' });
  } catch (error) {
    console.error("Failed to start MQTT connection:", error);
    return NextResponse.json({ error: 'Failed to start MQTT connection' }, { status: 500 });
  }
}