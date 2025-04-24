import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/models/user';
import { verify } from 'jsonwebtoken';

export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    // Check if the authorization header is present
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    // Extract the token from the authorization header
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = verify(token, process.env.JWT_SECRET || 'asdfghjkl');
      
      // Get the user from the database
      const user = await getUserById(decoded.userId);
      
      // If no user is found, return an error
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Return the user without the password
      const { password, ...userWithoutPassword } = user;
      return NextResponse.json({ user: userWithoutPassword });
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while getting user information' },
      { status: 500 }
    );
  }
} 