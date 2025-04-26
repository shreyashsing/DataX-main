import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Verify authentication token
    const authResult = await verifyAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    // Return the user data without sensitive information
    const { user } = authResult;
    
    // Don't send the password back to the client
    const { password, ...safeUser } = user;
    
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
} 