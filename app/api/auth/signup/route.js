import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/models/user';
import { sign } from 'jsonwebtoken';

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { name, email, password } = body;
    
    // Check if all required fields are provided
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if the email is already in use
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }
    
    // Create the user
    const user = await createUser({ name, email, password });
    
    // Generate a JWT token
    const token = sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'asdfghjkl',
      { expiresIn: '7d' }
    );
    
    // Return the user and token
    return NextResponse.json({ 
      user, 
      token,
      message: 'User created successfully' 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
} 