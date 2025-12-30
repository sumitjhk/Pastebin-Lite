import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = Redis.fromEnv();

export interface StoredPaste {
  content: string;
  createdAt: number;
  expiresAt: number | null;
  maxViews: number | null;
  remainingViews: number | null;
}

export async function savePaste(id: string, paste: StoredPaste): Promise<void> {
  const key = `paste:${id}`;
  
  if (paste.expiresAt) {
    // Calculate TTL in seconds
    const ttlSeconds = Math.ceil((paste.expiresAt - paste.createdAt) / 1000);
    await redis.setex(key, ttlSeconds, JSON.stringify(paste));
  } else {
    // No expiry - store indefinitely
    await redis.set(key, JSON.stringify(paste));
  }
}

export async function getPaste(id: string): Promise<StoredPaste | null> {
  const key = `paste:${id}`;
  const data = await redis.get(key);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : (data as StoredPaste);
}

export async function decrementViews(id: string): Promise<number> {
  const key = `paste:${id}`;
  const data = await redis.get(key);
  
  if (!data) return -1;
  
  const paste = typeof data === 'string' ? JSON.parse(data) : (data as StoredPaste);
  
  if (paste.remainingViews === null) {
    return -1;
  }
  
  const newRemainingViews = paste.remainingViews - 1;
  
  if (newRemainingViews <= 0) {
    // Delete the paste if no views remaining
    await redis.del(key);
    return -1;
  }
  
  // Update remaining views
  paste.remainingViews = newRemainingViews;
  
  // Preserve TTL if it exists
  if (paste.expiresAt) {
    const ttlSeconds = Math.ceil((paste.expiresAt - Date.now()) / 1000);
    await redis.setex(key, Math.max(1, ttlSeconds), JSON.stringify(paste));
  } else {
    await redis.set(key, JSON.stringify(paste));
  }
  
  return newRemainingViews;
}

export async function deletePaste(id: string): Promise<void> {
  const key = `paste:${id}`;
  await redis.del(key);
}
