import { NextResponse } from 'next/server';

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/api/dashboard',
  '/api/user',
  '/settings',
  '/profile'
];

// Paths that should be redirected to dashboard if user is already authenticated
const authPaths = [
  '/login',
  '/signup'
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is a protected path
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));
  
  // Get the token from the cookies
  const token = request.cookies.get('auth-token')?.value;
  
  // If the path is protected and there's no token, redirect to login
  if (isProtectedPath && !token) {
    console.log('No auth token found, redirecting to login from:', pathname);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If the path is an auth path and there's a token, redirect to dashboard
  if (isAuthPath && token) {
    console.log('Auth token found, redirecting to dashboard from:', pathname);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Otherwise, continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}; 