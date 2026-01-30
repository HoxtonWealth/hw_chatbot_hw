import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'gtm-kb-session'
const SESSION_DURATION = 120 // 2 minutes in seconds

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/process']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get(COOKIE_NAME)
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Refresh cookie (sliding window) - extends session on each valid request
  const response = NextResponse.next()
  response.cookies.set(COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
