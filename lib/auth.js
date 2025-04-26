import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getUserById } from './models/user';

export function getAuthToken(request) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('Auth token found in Authorization header');
      return authHeader.substring(7);
    }
    
    // Get token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (token) {
      console.log('Auth token found in cookies');
      return token;
    }
    
    console.log('No auth token found in request');
    return null;
  } catch (error) {
    console.error('Error extracting auth token:', error);
    return null;
  }
}

export async function verifyAuth(request) {
  try {
    const token = getAuthToken(request);
    
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Verify the token
    const decoded = verify(token, process.env.JWT_SECRET || 'asdfghjkl');
    
    // Get the user from the database
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return { 
      success: true,
      userId: decoded.userId,
      user
    };
    
  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, error: 'Invalid or expired token' };
  }
} 