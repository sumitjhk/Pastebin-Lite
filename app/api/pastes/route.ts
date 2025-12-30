import { NextRequest, NextResponse } from 'next/server';
import { createPaste, validateCreatePasteRequest } from '@/lib/paste';
import { getCurrentTime } from '@/lib/time';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = validateCreatePasteRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Get current time (supports TEST_MODE)
    const currentTime = getCurrentTime(request.headers);
    
    // Create paste
    const id = await createPaste(validation.request!, currentTime);
    
    // Generate URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/p/${id}`;
    
    return NextResponse.json(
      { id, url },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating paste:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}