import { nanoid } from 'nanoid';
import { CreatePasteRequest, Paste } from '@/types/paste';
import { savePaste, getPaste, decrementViews, StoredPaste } from './redis';
import { getCurrentTime, isExpired } from './time';

export async function createPaste(
  request: CreatePasteRequest,
  currentTime: number
): Promise<string> {
  const id = nanoid(10);
  
  const expiresAt = request.ttl_seconds
    ? currentTime + request.ttl_seconds * 1000
    : null;
  
  const paste: StoredPaste = {
    content: request.content,
    createdAt: currentTime,
    expiresAt,
    maxViews: request.max_views ?? null,
    remainingViews: request.max_views ?? null,
  };
  
  await savePaste(id, paste);
  return id;
}

export async function fetchPaste(
  id: string,
  currentTime: number,
  decrementView: boolean = false
): Promise<StoredPaste | null> {
  const paste = await getPaste(id);
  
  if (!paste) {
    return null;
  }
  
  // Check if expired
  if (isExpired(paste.expiresAt, currentTime)) {
    return null;
  }
  
  // Check if view limit reached
  if (paste.remainingViews !== null && paste.remainingViews <= 0) {
    return null;
  }
  
  // Decrement view count if requested
  if (decrementView && paste.remainingViews !== null) {
    const newViews = await decrementViews(id);
    if (newViews === -1) {
      return null;
    }
    paste.remainingViews = newViews;
  }
  
  return paste;
}

export function validateCreatePasteRequest(data: any): {
  valid: boolean;
  error?: string;
  request?: CreatePasteRequest;
} {
  if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
    return { valid: false, error: 'content is required and must be a non-empty string' };
  }
  
  if (data.ttl_seconds !== undefined) {
    if (!Number.isInteger(data.ttl_seconds) || data.ttl_seconds < 1) {
      return { valid: false, error: 'ttl_seconds must be an integer >= 1' };
    }
  }
  
  if (data.max_views !== undefined) {
    if (!Number.isInteger(data.max_views) || data.max_views < 1) {
      return { valid: false, error: 'max_views must be an integer >= 1' };
    }
  }
  
  return {
    valid: true,
    request: {
      content: data.content,
      ttl_seconds: data.ttl_seconds,
      max_views: data.max_views,
    },
  };
}