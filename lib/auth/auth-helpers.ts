import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { connectToDatabase, ObjectId } from '../db';

// Secret used to sign JWTs
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify authentication token
export async function verifyAuth(tokenOrRequest: string | Request) {
  try {
    // If we received a Request object, extract the token
    let token: string | null = null;
    if (typeof tokenOrRequest !== 'string') {
      token = getAuthTokenFromRequest(tokenOrRequest);
      if (!token) {
        return {
          isValid: false,
          userId: null,
          message: 'No token found in request'
        };
      }
    } else {
      token = tokenOrRequest;
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string;
      email: string;
      exp: number;
    };

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      return {
        isValid: false,
        userId: null,
        message: 'Token expired'
      };
    }

    // Connect to database to verify user exists
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return {
        isValid: false,
        userId: null,
        message: 'User not found'
      };
    }

    return {
      isValid: true,
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      isValid: false,
      userId: null,
      message: 'Invalid token'
    };
  }
}

// Get authentication token from cookies
export function getAuthToken() {
  const cookieStore = cookies();
  return cookieStore.get('auth-token')?.value;
}

// Extract auth token from a request (either cookies or Authorization header)
export function getAuthTokenFromRequest(request: Request): string | null {
  try {
    // First try Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('Found token in Authorization header');
      return authHeader.substring(7);
    }
    
    // If no header, try cookies
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(cookie => {
          const [name, ...rest] = cookie.trim().split('=');
          return [name, rest.join('=')];
        })
      );
      
      if (cookies['auth-token']) {
        console.log('Found token in cookies');
        return cookies['auth-token'];
      }
    }
    
    console.log('No auth token found in request');
    return null;
  } catch (error) {
    console.error('Error extracting auth token:', error);
    return null;
  }
}

// Get current user from token
export async function getCurrentUser() {
  const token = getAuthToken();
  
  if (!token) {
    return null;
  }

  try {
    const authResult = await verifyAuth(token);
    
    if (!authResult.isValid || !authResult.userId) {
      return null;
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(authResult.userId) });
    
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
} 