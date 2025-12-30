import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  try {
    // Check if environment variables are set
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('Missing Upstash Redis environment variables');
      return NextResponse.json(
        { ok: false, error: 'Missing Redis environment variables' },
        { status: 500 }
      );
    }
    
    // Initialize Redis client
    const redis = Redis.fromEnv();
    
    // Quick health check - try to ping Redis
    await redis.ping();
    
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}