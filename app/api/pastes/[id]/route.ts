import { NextRequest, NextResponse } from 'next/server';
import { fetchPaste } from '@/lib/paste';
import { getCurrentTime } from '@/lib/time';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current time (supports TEST_MODE)
    const currentTime = getCurrentTime(request.headers);
    
    // Fetch paste and decrement view count
    const paste = await fetchPaste(id, currentTime, true);
    
    if (!paste) {
      return NextResponse.json(
        { error: 'Paste not found or expired' },
        { status: 404 }
      );
    }
    
    // Format response
    const response = {
      content: paste.content,
      remaining_views: paste.remainingViews,
      expires_at: paste.expiresAt ? new Date(paste.expiresAt).toISOString() : null,
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}