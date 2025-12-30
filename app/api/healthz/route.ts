import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  try {
    // Initialize Redis client
    const redis = Redis.fromEnv();
    
    // Quick health check - try to ping Redis
    await redis.ping();
    
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}