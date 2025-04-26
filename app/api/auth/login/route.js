import { NextResponse } from 'next/server';
import { validateUserCredentials } from '@/lib/models/user';
import { sign } from 'jsonwebtoken';

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { email, password } = body;
    
    // Check if email and password are provided
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Validate the user credentials
    const user = await validateUserCredentials(email, password);
    
    // If the credentials are invalid, return an error
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    console.log('Login successful for user ID:', user._id);
    
    // Generate a JWT token
    const token = sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'asdfghjkl',
      { expiresIn: '7d' }
    );
    
    console.log('Generated token with userId:', user._id.toString());
    
    // Return the user and token
    return NextResponse.json({ user, token });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 